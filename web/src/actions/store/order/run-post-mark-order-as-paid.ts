import { processFiatTopUpAfterPaymentAction } from "@/actions/store/credit/process-fiat-topup-after-payment";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
import { processRsvpAfterPaymentAction } from "@/actions/store/reservation/process-rsvp-after-payment";
import { sendCreditSuccess } from "@/actions/mail/send-credit-success";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { markOrderAsPaidCore } from "@/lib/shop/mark-order-as-paid-core";
import {
	storeOrderPaymentResultArgs,
	type MarkOrderAsPaidInput,
	type StoreOrderPaymentResult,
} from "@/lib/shop/order-query-types";
import {
	isCreditRefillOrder,
	isFiatRefillOrder,
	isRsvpOrder,
} from "./detect-order-type";

interface RunPostMarkOrderAsPaidParams {
	order: MarkOrderAsPaidInput;
	orderId: string;
	paymentMethodId: string;
	isPro: boolean;
	checkoutAttributes?: string;
	logTags?: string[];
}

function paymentLogTags(kind: string, extraTags: string[] = []): string[] {
	return ["order", "payment", kind, ...extraTags];
}

/**
 * Marks an order paid and runs fiat/credit/RSVP follow-ups shared by storefront,
 * store admin, and Stripe shop webhooks.
 */
export async function runPostMarkOrderAsPaid(
	params: RunPostMarkOrderAsPaidParams,
): Promise<StoreOrderPaymentResult> {
	const {
		order,
		orderId,
		paymentMethodId,
		isPro,
		checkoutAttributes,
		logTags = [],
	} = params;

	const updatedOrder = await markOrderAsPaidCore({
		order,
		paymentMethodId,
		isPro,
		checkoutAttributes,
		logTags,
	});

	if (await isFiatRefillOrder(order)) {
		logger.info("Processing fiat top-up after marking order as paid", {
			metadata: { orderId },
			tags: paymentLogTags("fiat", logTags),
		});

		const fiatResult = await processFiatTopUpAfterPaymentAction({
			orderId: order.id,
		});

		if (fiatResult?.serverError) {
			logger.error("Failed to process fiat top-up", {
				metadata: {
					orderId,
					error: fiatResult.serverError,
				},
				tags: paymentLogTags("fiat", ["error", ...logTags]),
			});
		}
	}

	if (await isCreditRefillOrder(order)) {
		logger.info("Processing credit top-up after marking order as paid", {
			metadata: { orderId },
			tags: paymentLogTags("credit", logTags),
		});

		const creditResult = await processCreditTopUpAfterPaymentAction({
			orderId: order.id,
		});

		if (creditResult?.serverError) {
			logger.error("Failed to process credit top-up", {
				metadata: {
					orderId,
					error: creditResult.serverError,
				},
				tags: paymentLogTags("credit", ["error", ...logTags]),
			});
		} else {
			try {
				const fullOrder = await sqlClient.storeOrder.findUnique({
					where: { id: orderId },
					...storeOrderPaymentResultArgs,
				});
				if (fullOrder) {
					await sendCreditSuccess(fullOrder);
				}
			} catch (mailError) {
				logger.error("Failed to send credit top-up success email", {
					metadata: {
						orderId,
						error:
							mailError instanceof Error
								? mailError.message
								: String(mailError),
					},
					tags: paymentLogTags("credit", ["email", "error", ...logTags]),
				});
			}
		}
	}

	if (await isRsvpOrder(order.id)) {
		logger.info("Processing RSVP after marking order as paid", {
			metadata: { orderId },
			tags: paymentLogTags("rsvp", logTags),
		});

		const rsvpResult = await processRsvpAfterPaymentAction({
			orderId: order.id,
		});

		if (rsvpResult?.serverError) {
			logger.error("Failed to process RSVP", {
				metadata: {
					orderId,
					error: rsvpResult.serverError,
				},
				tags: paymentLogTags("rsvp", ["error", ...logTags]),
			});
		}
	}

	return updatedOrder;
}
