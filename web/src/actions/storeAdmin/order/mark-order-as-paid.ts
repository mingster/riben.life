"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { markOrderAsPaidCore } from "@/actions/store/order/mark-order-as-paid-core";

/**
 * Mark order as paid (store admin).
 * This action allows store admins to manually mark orders as paid (e.g., for cash/in-person payments).
 * This action:
 * 1. Validates the order belongs to the store
 * 2. Marks the order as paid
 * 3. Creates a StoreLedger entry with fees calculation
 * 4. Updates order status to Processing
 */
export const markOrderAsPaidAction = storeActionClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
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

		// Use shared core function
		const updatedOrder = await markOrderAsPaidCore({
			order,
			paymentMethodId: finalPaymentMethodId,
			isPro,
			checkoutAttributes,
			logTags: ["store-admin"],
		});

		return { order: updatedOrder };
	});
