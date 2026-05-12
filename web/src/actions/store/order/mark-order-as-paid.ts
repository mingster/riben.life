"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { markOrderAsPaidInputArgs } from "@/lib/shop/order-query-types";
import { runPostMarkOrderAsPaid } from "./run-post-mark-order-as-paid";

/**
 * Mark order as paid (for cash/in-person payments or admin confirmation).
 */
export const markOrderAsPaidAction = baseClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput }) => {
		const { orderId, paymentMethodId, checkoutAttributes } = parsedInput;

		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			...markOrderAsPaidInputArgs,
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		const resolvedPaymentMethodId =
			paymentMethodId ?? order.PaymentMethod?.id ?? null;
		if (!resolvedPaymentMethodId) {
			throw new SafeError("Payment method not found");
		}

		const isPro = (order.Store.level ?? 0) > 0;

		const updatedOrder = await runPostMarkOrderAsPaid({
			order,
			orderId,
			paymentMethodId: resolvedPaymentMethodId,
			isPro,
			checkoutAttributes,
		});

		return { order: updatedOrder };
	});
