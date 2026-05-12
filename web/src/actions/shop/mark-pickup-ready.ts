"use server";

import { z } from "zod";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getShopStoreIdForRequest } from "@/lib/shop/shop-store-context";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

const schema = z.object({
	orderId: z.string().uuid(),
});

export const markShopPickupReadyAction = userRequiredActionClient
	.metadata({ name: "markShopPickupReady" })
	.schema(schema)
	.action(async ({ parsedInput, ctx }) => {
		const storeId = await getShopStoreIdForRequest();
		if (!storeId) {
			throw new SafeError("Storefront is not configured.");
		}

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: { ownerId: true },
		});
		if (!store || store.ownerId !== ctx.userId) {
			throw new SafeError("You do not have access to manage this store.");
		}

		const order = await sqlClient.storeOrder.findFirst({
			where: {
				id: parsedInput.orderId,
				storeId,
				shopFulfillmentType: "pickup",
			},
			select: { id: true, isPaid: true },
		});
		if (!order) {
			throw new SafeError("Order not found or not a pickup order.");
		}
		if (!order.isPaid) {
			throw new SafeError("Order is not paid yet.");
		}

		const now = getUtcNowEpoch();
		await sqlClient.storeOrder.update({
			where: { id: order.id },
			data: {
				shopPickupReadyAt: now,
				updatedAt: now,
			},
		});

		logger.info("Pickup marked ready", {
			metadata: { orderId: order.id, storeId },
			tags: ["shop", "pickup"],
		});

		return { success: true as const };
	});
