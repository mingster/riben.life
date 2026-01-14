"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { markOrderAsPaidCore } from "@/actions/store/order/mark-order-as-paid-core";
import {
	isFiatRefillOrder,
	isCreditRefillOrder,
	isRsvpOrder,
} from "@/actions/store/order/detect-order-type";
import { processFiatTopUpAfterPaymentAction } from "@/actions/store/credit/process-fiat-topup-after-payment";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
import { processRsvpAfterPaymentAction } from "@/actions/store/reservation/process-rsvp-after-payment";
import logger from "@/lib/logger";

/**
 * Mark order as paid (store admin).
 * This action allows store admins to manually mark orders as paid (e.g., for cash/in-person payments).
 * This action:
 * 1. Validates the order belongs to the store
 * 2. Marks the order as paid
 * 3. Creates a StoreLedger entry with fees calculation (for regular orders only)
 * 4. Updates order status to Processing (or Completed for RSVP orders)
 * 5. Processes credit/fiat top-ups if applicable
 * 6. Processes RSVP updates if applicable
 */
export const markOrderAsPaidAction = storeActionClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { orderId, paymentMethodId, checkoutAttributes } = parsedInput;

		// Get order with relations (including OrderItemView to check for order types)
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						id: true,
						level: true,
						LINE_PAY_ID: true,
						STRIPE_SECRET_KEY: true,
					},
				},
				PaymentMethod: true,
				OrderItemView: {
					select: {
						id: true,
						productId: true,
						name: true,
					},
				},
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		// Validate order belongs to the store
		if (order.storeId !== storeId) {
			throw new SafeError("Order does not belong to this store");
		}

		// Use provided paymentMethodId or fall back to order's PaymentMethod
		let finalPaymentMethodId = paymentMethodId;
		if (!finalPaymentMethodId) {
			if (!order.PaymentMethod) {
				throw new SafeError("Payment method not found");
			}
			finalPaymentMethodId = order.PaymentMethod.id;
		}

		// Determine if store is Pro level
		const isPro = await isProLevel(storeId);

		// Step 1: Mark order as paid (this handles StoreLedger for regular orders)
		const updatedOrder = await markOrderAsPaidCore({
			order,
			paymentMethodId: finalPaymentMethodId,
			isPro,
			checkoutAttributes,
			logTags: ["store-admin"],
		});

		// Step 2: Process additional actions based on order type
		// Check for fiat refill order
		const isFiatRefill = await isFiatRefillOrder(order);
		if (isFiatRefill) {
			logger.info("Processing fiat top-up after marking order as paid", {
				metadata: { orderId },
				tags: ["order", "payment", "fiat", "store-admin"],
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
					tags: ["order", "payment", "fiat", "error", "store-admin"],
				});
				// Don't throw - order is already marked as paid
			}
		}

		// Check for credit refill order
		const isCreditRefill = await isCreditRefillOrder(order);
		if (isCreditRefill) {
			logger.info("Processing credit top-up after marking order as paid", {
				metadata: { orderId },
				tags: ["order", "payment", "credit", "store-admin"],
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
					tags: ["order", "payment", "credit", "error", "store-admin"],
				});
				// Don't throw - order is already marked as paid
			}
		}

		// Check for RSVP order
		const isRsvp = await isRsvpOrder(order.id);
		if (isRsvp) {
			logger.info("Processing RSVP after marking order as paid", {
				metadata: { orderId },
				tags: ["order", "payment", "rsvp", "store-admin"],
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
					tags: ["order", "payment", "rsvp", "error", "store-admin"],
				});
				// Don't throw - order is already marked as paid
			}
		}

		return { order: updatedOrder };
	});
