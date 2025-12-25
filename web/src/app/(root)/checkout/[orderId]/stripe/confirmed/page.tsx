"use server";

import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { stripe } from "@/lib/stripe/config";
import logger from "@/lib/logger";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { StoreOrder } from "@/types";
import { sqlClient } from "@/lib/prismadb";

/**
 * Payment confirmation page for Stripe checkout orders.
 * Called when Stripe redirects back after payment.
 * Verifies PaymentIntent status and marks order as paid.
 */
export default async function StripeConfirmedPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{
		payment_intent?: string;
		payment_intent_client_secret?: string;
		redirect_status?: string;
		returnUrl?: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	if (!params.orderId) {
		throw new Error("Order ID is missing");
	}

	// Verify payment intent
	if (
		searchParams.payment_intent &&
		searchParams.payment_intent_client_secret &&
		searchParams.redirect_status === "succeeded"
	) {
		try {
			// Verify payment intent with Stripe
			const paymentIntent = await stripe.paymentIntents.retrieve(
				searchParams.payment_intent,
				{
					client_secret: searchParams.payment_intent_client_secret,
				},
			);

			if (paymentIntent && paymentIntent.status === "succeeded") {
				// Find Stripe payment method
				const stripePaymentMethod = await sqlClient.paymentMethod.findFirst({
					where: {
						payUrl: "stripe",
						isDeleted: false,
					},
				});

				if (!stripePaymentMethod) {
					throw new Error("Stripe payment method not found");
				}

				// Prepare checkout attributes with payment intent data
				const checkoutAttributes = JSON.stringify({
					payment_intent: searchParams.payment_intent,
					client_secret: searchParams.payment_intent_client_secret,
				});

				// Mark order as paid using the new action
				const result = await markOrderAsPaidAction({
					orderId: params.orderId,
					paymentMethodId: stripePaymentMethod.id,
					checkoutAttributes,
				});

				if (result?.serverError) {
					logger.error("Failed to mark order as paid", {
						metadata: {
							orderId: params.orderId,
							error: result.serverError,
						},
						tags: ["error", "payment", "stripe"],
					});
					// Still redirect to success page, but log the error
				} else if (result?.data) {
					logger.info("Order payment processed successfully", {
						metadata: {
							orderId: params.orderId,
						},
						tags: ["payment", "stripe", "success"],
					});
				}

				// Always show success page briefly, then redirect to returnUrl if provided
				const updatedOrder = result?.data?.order as StoreOrder;
				if (!updatedOrder) {
					throw new Error("order not found");
				}

				return (
					<Suspense fallback={<Loader />}>
						<Container>
							<SuccessAndRedirect order={updatedOrder} returnUrl={returnUrl} />
						</Container>
					</Suspense>
				);
			}
		} catch (error) {
			if (error instanceof Error && error.message === "NEXT_REDIRECT") {
				// Expected control flow from redirect(); do not log as an error
				throw error;
			}
			logger.error("Payment confirmation error", {
				metadata: {
					orderId: params.orderId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["error", "payment", "stripe"],
			});
		}
	}

	// Show loading state while processing
	return (
		<Container>
			<Loader />
		</Container>
	);
}
