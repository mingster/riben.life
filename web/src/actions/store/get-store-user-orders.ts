"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreOrder } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isValidGuid } from "@/utils/guid-utils";

const getStoreUserOrdersSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export const getStoreUserOrdersAction = userRequiredActionClient
	.metadata({ name: "getStoreUserOrders" })
	.schema(getStoreUserOrdersSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { storeId } = parsedInput;
		const userId = ctx.userId;

		// Find store by ID (UUID) or name
		const isUuid = isValidGuid(storeId);
		const store = await sqlClient.store.findFirst({
			where: isUuid
				? { id: storeId }
				: { name: { equals: storeId, mode: "insensitive" } },
			select: {
				id: true,
				name: true,
				defaultTimezone: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Use the actual store ID for subsequent queries
		const actualStoreId = store.id;

		// Fetch orders for the current user in this store
		const orders = await sqlClient.storeOrder.findMany({
			where: {
				storeId: actualStoreId,
				userId: userId,
			},
			include: {
				Store: {
					select: {
						id: true,
						name: true,
						defaultTimezone: true,
					},
				},
				OrderItemView: true,
				ShippingMethod: true,
				PaymentMethod: true,
				OrderNotes: true,
			},
			orderBy: { updatedAt: "desc" },
		});

		// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
		transformPrismaDataForJson(orders);

		return {
			orders: orders as StoreOrder[],
			storeTimezone: store.defaultTimezone || "Asia/Taipei",
		};
	});
