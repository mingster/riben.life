import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/payment/stripe/config";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { StoreOrder } from "@/types";

/**
 * Stripe redirects here after payment. Verifies PaymentIntent and marks order paid.
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

	if (
		searchParams.payment_intent &&
		searchParams.payment_intent_client_secret &&
		searchParams.redirect_status === "succeeded"
	) {
		try {
			const paymentIntent = await stripe.paymentIntents.retrieve(
				searchParams.payment_intent,
				{
					client_secret: searchParams.payment_intent_client_secret,
				},
			);

			if (paymentIntent && paymentIntent.status === "succeeded") {
				const stripePaymentMethod = await sqlClient.paymentMethod.findFirst({
					where: {
						payUrl: "stripe",
						isDeleted: false,
					},
				});

				if (!stripePaymentMethod) {
					throw new Error("Stripe payment method not found");
				}

				const checkoutAttributes = JSON.stringify({
					payment_intent: searchParams.payment_intent,
					client_secret: searchParams.payment_intent_client_secret,
				});

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
				} else if (result?.data) {
					logger.info("Order payment processed successfully", {
						metadata: {
							orderId: params.orderId,
						},
						tags: ["payment", "stripe", "success"],
					});
				}

				let updatedOrder = result?.data?.order as StoreOrder | undefined;
				if (!updatedOrder) {
					updatedOrder = (await getOrderById(
						params.orderId,
					)) as StoreOrder | null;
				}
				if (!updatedOrder) {
					throw new Error("order not found");
				}
				const { rsvp, postPaymentSignInToken } =
					await getPostPaymentSignInProps(updatedOrder.id);

				return (
					<Suspense fallback={<Loader />}>
						<Container>
							<SuccessAndRedirect
								order={updatedOrder}
								returnUrl={returnUrl}
								rsvp={rsvp}
								postPaymentSignInToken={postPaymentSignInToken}
							/>
						</Container>
					</Suspense>
				);
			}
		} catch (error) {
			if (error instanceof Error && error.message === "NEXT_REDIRECT") {
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

	return (
		<Container>
			<Loader />
		</Container>
	);
}
