"use server";

import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const getUnpaidTotalSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

/**
 * Get the total amount of unpaid orders for the current user in a store.
 * This calculates the sum of orderTotal for all unpaid orders (isPaid = false).
 */
export const getUnpaidTotalAction = userRequiredActionClient
	.metadata({ name: "getUnpaidTotal" })
	.schema(getUnpaidTotalSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { storeId } = parsedInput;
		const userId = ctx.userId;

		// Calculate sum of unpaid orders using aggregate
		const result = await sqlClient.storeOrder.aggregate({
			where: {
				storeId,
				userId,
				isPaid: false,
			},
			_sum: {
				orderTotal: true,
			},
		});

		const unpaidTotal = result._sum.orderTotal
			? Number(result._sum.orderTotal)
			: 0;

		return {
			unpaidTotal,
		};
	});
