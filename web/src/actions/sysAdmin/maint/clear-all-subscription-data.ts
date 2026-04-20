"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

/**
 * Deletes all platform store subscription rows and checkout payment rows,
 * then resets any store still on Pro/Multi to Free (dev maintenance only).
 */
export const clearAllSubscriptionData = async () => {
	const payments = await sqlClient.subscriptionPayment.deleteMany({
		where: {},
	});
	const subscriptions = await sqlClient.storeSubscription.deleteMany({
		where: {},
	});
	const now = getUtcNowEpoch();
	const stores = await sqlClient.store.updateMany({
		where: {
			level: { in: [StoreLevel.Pro, StoreLevel.Multi] },
		},
		data: {
			level: StoreLevel.Free,
			updatedAt: now,
		},
	});

	logger.info("Cleared subscription maintenance data", {
		metadata: {
			subscriptionPaymentDeleted: payments.count,
			storeSubscriptionDeleted: subscriptions.count,
			storesResetToFree: stores.count,
		},
		tags: ["action", "maintenance", "subscription"],
	});

	return {
		subscriptionPaymentDeleted: payments.count,
		storeSubscriptionDeleted: subscriptions.count,
		storesResetToFree: stores.count,
	};
};
