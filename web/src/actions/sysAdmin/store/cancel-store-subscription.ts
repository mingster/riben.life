"use server";

import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { adminActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import logger from "@/lib/logger";
import { stripe } from "@/lib/stripe/config";
import { cancelStoreSubscriptionSchema } from "./cancel-store-subscription.validation";

export const cancelStoreSubscriptionAction = adminActionClient
	.metadata({ name: "cancelStoreSubscription" })
	.schema(cancelStoreSubscriptionSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, note } = parsedInput;

		const subscription = await sqlClient.storeSubscription.findUnique({
			where: { storeId },
		});

		if (!subscription) {
			throw new SafeError("Subscription not found");
		}

		if (!subscription.subscriptionId) {
			throw new SafeError("No active subscription to cancel");
		}

		// Cancel at Stripe
		const subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
			subscription.subscriptionId,
		);

		await stripe.subscriptionSchedules.cancel(subscriptionSchedule.id);

		if (
			subscriptionSchedule.subscription &&
			typeof subscriptionSchedule.subscription !== "string"
		) {
			await stripe.subscriptions.cancel(subscriptionSchedule.subscription.id);
		}

		const now = getUtcNowEpoch();

		const updatedSubscription = await sqlClient.storeSubscription.update({
			where: { storeId },
			data: {
				subscriptionId: null,
				status: SubscriptionStatus.Cancelled,
				note: note ?? subscription.note ?? "",
				updatedAt: now,
			},
		});

		const updatedStore = await sqlClient.store.update({
			where: { id: storeId },
			data: {
				level: StoreLevel.Free,
				updatedAt: now,
			},
		});

		const result = {
			store: updatedStore,
			subscription: updatedSubscription,
		};

		transformPrismaDataForJson(result);

		logger.info("Admin cancelled store subscription", {
			metadata: {
				storeId,
				subscriptionId: subscription.subscriptionId,
			},
			tags: ["sysAdmin", "subscription"],
		});

		return result;
	});
