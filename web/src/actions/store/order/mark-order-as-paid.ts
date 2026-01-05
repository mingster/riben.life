"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { markOrderAsPaidCore } from "./mark-order-as-paid-core";

/**
 * Mark order as paid (for cash/in-person payments or admin confirmation).
 * This action:
 * 1. Marks the order as paid
 * 2. Creates a StoreLedger entry with fees calculation
 * 3. Updates order status to Processing
 */
export const markOrderAsPaidAction = baseClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput }) => {
		const { orderId, paymentMethodId, checkoutAttributes } = parsedInput;

		// Get order with relations (including OrderItemView to check for Store Credit)
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

		// Use provided paymentMethodId or fall back to order's PaymentMethod
		let finalPaymentMethodId = paymentMethodId;
		if (!finalPaymentMethodId) {
			if (!order.PaymentMethod) {
				throw new SafeError("Payment method not found");
			}
			finalPaymentMethodId = order.PaymentMethod.id;
		}

		// Determine if store is Pro level
		const isPro = (order.Store.level ?? 0) > 0;

		// Use shared core function
		const updatedOrder = await markOrderAsPaidCore({
			order,
			paymentMethodId: finalPaymentMethodId,
			isPro,
			checkoutAttributes,
		});

		return { order: updatedOrder };
	});
