"use server";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { stripe } from "@/lib/stripe/config";
import { sqlClient } from "@/lib/prismadb";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { getAbsoluteUrl } from "@/utils/utils";
import logger from "@/lib/logger";

function isNextRedirectError(err: unknown): boolean {
	// next/navigation's redirect() throws an internal error used for control flow.
	// It commonly has `message === "NEXT_REDIRECT"` and/or a `digest` starting with "NEXT_REDIRECT".
	if (err instanceof Error && err.message === "NEXT_REDIRECT") return true;
	if (typeof err !== "object" || err === null) return false;
	if (!("digest" in err)) return false;
	const digest = (err as { digest?: unknown }).digest;
	return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * Payment confirmation page for credit recharge.
 * Called when Stripe redirects back after payment.
 * Processes credit top-up and marks order as paid.
 */
export default async function RechargeConfirmedPage(props: {
	params: Promise<{ storeId: string; orderId: string }>;
	searchParams: Promise<{
		payment_intent?: string;
		payment_intent_client_secret?: string;
		redirect_status?: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;

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
				// Process credit top-up after payment
				const result = await processCreditTopUpAfterPaymentAction({
					orderId: params.orderId,
				});

				if (result?.serverError) {
					logger.error("Failed to process credit top-up", {
						metadata: {
							orderId: params.orderId,
							error: result.serverError,
						},
						tags: ["error", "credit", "payment"],
					});
					// Still redirect to success page, but log the error
				} else if (result?.data) {
					logger.info("Credit recharge processed successfully", {
						metadata: {
							orderId: params.orderId,
							amount: result.data.amount,
							bonus: result.data.bonus,
							totalCredit: result.data.totalCredit,
						},
						tags: ["credit", "payment", "success"],
					});
				}

				// Redirect to success page
				redirect(
					`${getAbsoluteUrl()}/s/${params.storeId}/recharge/${params.orderId}/success`,
				);
			}
		} catch (error) {
			if (isNextRedirectError(error)) {
				// Expected control flow from redirect(); do not log as an error.
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
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect orderId={params.orderId} />
			</Container>
		</Suspense>
	);
}
