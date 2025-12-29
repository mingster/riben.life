"use server";

import { updateOrderPaymentMethodSchema } from "./update-order-payment-method.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Update order's payment method.
 * This action allows updating the payment method for an order (e.g., changing from TBD to cash).
 * Works for both authenticated users (verifies ownership) and anonymous orders.
 */
export const updateOrderPaymentMethodAction = baseClient
	.metadata({ name: "updateOrderPaymentMethod" })
	.schema(updateOrderPaymentMethodSchema)
	.action(async ({ parsedInput }) => {
		const { orderId, paymentMethodId } = parsedInput;

		// Get session if available (optional for anonymous orders)
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;

		// Get order to verify it belongs to the user
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				userId: true,
				storeId: true,
				paymentMethodId: true,
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		// Verify order belongs to the user if order has a userId
		// Allow anonymous orders (userId is null) to be updated
		if (order.userId && userId && order.userId !== userId) {
			throw new SafeError("Unauthorized: Order does not belong to user");
		}

		// Verify payment method exists
		const paymentMethod = await sqlClient.paymentMethod.findUnique({
			where: { id: paymentMethodId },
			select: { id: true, isDeleted: true },
		});

		if (!paymentMethod || paymentMethod.isDeleted) {
			throw new SafeError("Payment method not found");
		}

		// Update order's payment method
		await sqlClient.storeOrder.update({
			where: { id: orderId },
			data: {
				paymentMethodId,
				updatedAt: getUtcNowEpoch(),
			},
		});

		logger.info("Order payment method updated", {
			metadata: {
				orderId,
				userId,
				storeId: order.storeId,
				oldPaymentMethodId: order.paymentMethodId,
				newPaymentMethodId: paymentMethodId,
			},
			tags: ["order", "payment-method", "update"],
		});

		return { success: true };
	});
