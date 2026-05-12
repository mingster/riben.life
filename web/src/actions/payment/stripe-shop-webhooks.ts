import type Stripe from "stripe";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

/**
 * Store-order Stripe webhook handling (`payment_intent.*`).
 * Invoked only via `handle-stripe-webhook-post`; routes must not call `markOrderAsPaidAction` directly.
 */
export async function handleStripeShopWebhookEvent(
	event: Stripe.Event,
): Promise<void> {
	switch (event.type) {
		case "payment_intent.succeeded": {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const orderId = paymentIntent.metadata?.orderId;

			if (!orderId) {
				logger.warn(
					"payment_intent.succeeded webhook missing orderId metadata",
					{
						metadata: {
							paymentIntentId: paymentIntent.id,
							metadata: paymentIntent.metadata,
						},
						tags: ["payment", "stripe", "webhook", "warning"],
					},
				);
				return;
			}

			try {
				const stripePaymentMethod = await sqlClient.paymentMethod.findFirst({
					where: {
						payUrl: "stripe",
						isDeleted: false,
					},
				});

				if (!stripePaymentMethod) {
					logger.error("Stripe payment method not found for webhook", {
						metadata: {
							orderId,
							paymentIntentId: paymentIntent.id,
						},
						tags: ["payment", "stripe", "webhook", "error"],
					});
					return;
				}

				if (!stripePaymentMethod.platformEnabled) {
					logger.warn(
						"Stripe webhook skipped: platform disabled for Stripe processor",
						{
							metadata: {
								orderId,
								paymentIntentId: paymentIntent.id,
							},
							tags: ["payment", "stripe", "webhook", "platform-disabled"],
						},
					);
					return;
				}

				const checkoutAttributes = JSON.stringify({
					payment_intent: paymentIntent.id,
					client_secret: paymentIntent.client_secret,
					source: "webhook",
				});

				const result = await markOrderAsPaidAction({
					orderId,
					paymentMethodId: stripePaymentMethod.id,
					checkoutAttributes,
				});

				if (result?.serverError) {
					logger.error("Failed to mark order as paid via webhook", {
						metadata: {
							orderId,
							paymentIntentId: paymentIntent.id,
							error: result.serverError,
						},
						tags: ["payment", "stripe", "webhook", "error"],
					});
				} else if (result?.data) {
					logger.info("Order marked as paid via Stripe webhook", {
						metadata: {
							orderId,
							paymentIntentId: paymentIntent.id,
							amount: paymentIntent.amount,
							currency: paymentIntent.currency,
						},
						tags: ["payment", "stripe", "webhook", "success"],
					});
				}
			} catch (error: unknown) {
				logger.error("Error processing payment_intent.succeeded webhook", {
					metadata: {
						orderId,
						paymentIntentId: paymentIntent.id,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["payment", "stripe", "webhook", "error"],
				});
			}
			break;
		}

		case "payment_intent.payment_failed": {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const orderId = paymentIntent.metadata?.orderId;

			logger.warn("Payment intent failed", {
				metadata: {
					orderId,
					paymentIntentId: paymentIntent.id,
					error: paymentIntent.last_payment_error?.message,
				},
				tags: ["payment", "stripe", "webhook", "failed"],
			});
			break;
		}

		case "payment_intent.canceled": {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const orderId = paymentIntent.metadata?.orderId;

			logger.info("Payment intent canceled", {
				metadata: {
					orderId,
					paymentIntentId: paymentIntent.id,
				},
				tags: ["payment", "stripe", "webhook", "canceled"],
			});
			break;
		}

		default:
			logger.warn("Unexpected shop Stripe event passed to shop handler", {
				metadata: { type: event.type },
				tags: ["payment", "stripe", "webhook"],
			});
	}
}
