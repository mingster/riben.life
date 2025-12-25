import { stripe } from "@/lib/stripe/config";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import logger from "@/lib/logger";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { sqlClient } from "@/lib/prismadb";

const relevantEvents = new Set([
	"product.created",
	"product.updated",
	"product.deleted",
	"price.created",
	"price.updated",
	"price.deleted",
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
]);

// stripe webhook handler
export async function POST(req: Request) {
	const body = await req.text();
	const sig = req.headers.get("stripe-signature") as string;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	let event: Stripe.Event;

	try {
		if (!sig || !webhookSecret)
			return new Response("Webhook secret not found.", { status: 400 });
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
		logger.info("Operation log", {
			tags: ["api"],
		});
	} catch (err: unknown) {
		logger.error("Stripe webhook error", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "stripe", "webhook", "error"],
		});

		return new Response(`Webhook Error: ${(err as Error).message}`, {
			status: 400,
		});
	}

	try {
		if (relevantEvents.has(event.type)) {
			switch (event.type) {
				case "product.created":
				case "product.updated":
					break;
				case "price.created":
				case "price.updated":
					break;
				case "price.deleted":
					break;
				case "product.deleted":
					break;
				case "customer.subscription.created":
				case "customer.subscription.updated":
				case "customer.subscription.deleted":
					break;
				case "checkout.session.completed":
					break;
				case "payment_intent.succeeded": {
					// Handle successful payment for store orders
					const paymentIntent = event.data.object as Stripe.PaymentIntent;
					const orderId = paymentIntent.metadata?.orderId;

					if (orderId) {
						try {
							// Find Stripe payment method
							const stripePaymentMethod =
								await sqlClient.paymentMethod.findFirst({
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
								break;
							}

							// Mark order as paid via webhook (idempotent)
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
						} catch (error) {
							logger.error(
								"Error processing payment_intent.succeeded webhook",
								{
									metadata: {
										orderId,
										paymentIntentId: paymentIntent.id,
										error:
											error instanceof Error ? error.message : String(error),
									},
									tags: ["payment", "stripe", "webhook", "error"],
								},
							);
						}
					} else {
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
					}
					break;
				}
				case "payment_intent.payment_failed": {
					// Log failed payment
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
					// Log canceled payment
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
					throw new Error("Unhandled relevant event!");
			}
		} else {
			return new NextResponse(`Unsupported event type: ${event.type}`, {
				status: 400,
			});
		}
	} catch (error: unknown) {
		logger.info("Operation log", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse("Webhook handler failed. View your server logs.", {
			status: 400,
		});
	}

	return new NextResponse(JSON.stringify({ received: true }));
}
