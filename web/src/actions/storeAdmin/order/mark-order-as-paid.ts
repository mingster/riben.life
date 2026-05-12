"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import isProLevel from "@/lib/store/is-pro-level";
import { markOrderAsPaidInputArgs } from "@/lib/shop/order-query-types";
import { runPostMarkOrderAsPaid } from "@/actions/store/order/run-post-mark-order-as-paid";

/**
 * Mark order as paid (store admin).
 */
export const markOrderAsPaidAction = storeActionClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { orderId, paymentMethodId, checkoutAttributes } = parsedInput;

		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			...markOrderAsPaidInputArgs,
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		if (order.storeId !== storeId) {
			throw new SafeError("Order does not belong to this store");
		}

		const resolvedPaymentMethodId =
			paymentMethodId ?? order.PaymentMethod?.id ?? null;
		if (!resolvedPaymentMethodId) {
			throw new SafeError("Payment method not found");
		}

		const isPro = await isProLevel(storeId);

		const updatedOrder = await runPostMarkOrderAsPaid({
			order,
			orderId,
			paymentMethodId: resolvedPaymentMethodId,
			isPro,
			checkoutAttributes,
			logTags: ["store-admin"],
		});

		return { order: updatedOrder };
	});
