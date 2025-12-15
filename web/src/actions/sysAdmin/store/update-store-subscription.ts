"use server";

import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch, dateToEpoch } from "@/utils/datetime-utils";
import { adminActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import logger from "@/lib/logger";
import { updateStoreSubscriptionSchema } from "./update-store-subscription.validation";

export const updateStoreSubscriptionAction = adminActionClient
	.metadata({ name: "updateStoreSubscription" })
	.schema(updateStoreSubscriptionSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, level, subscriptionId, expiration, note } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				ownerId: true,
				level: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const expirationEpoch =
			expiration instanceof Date ? dateToEpoch(expiration) : undefined;

		const updatedStore = await sqlClient.store.update({
			where: { id: storeId },
			data: {
				level: level ?? store.level ?? StoreLevel.Free,
				updatedAt: getUtcNowEpoch(),
			},
		});

		const existingSubscription = await sqlClient.storeSubscription.findUnique({
			where: { storeId },
		});

		const now = getUtcNowEpoch();

		const subscriptionData = {
			expiration:
				expirationEpoch ?? existingSubscription?.expiration ?? getUtcNowEpoch(), // fallback to now
			note: note ?? existingSubscription?.note ?? "",
			subscriptionId: subscriptionId ?? null,
			updatedAt: now,
			status: existingSubscription?.status ?? SubscriptionStatus.Active,
			billingProvider: existingSubscription?.billingProvider ?? "stripe",
			userId: existingSubscription?.userId ?? store.ownerId ?? "",
			storeId,
		};

		const updatedSubscription = existingSubscription
			? await sqlClient.storeSubscription.update({
					where: { storeId },
					data: subscriptionData,
				})
			: await sqlClient.storeSubscription.create({
					data: {
						...subscriptionData,
						createdAt: now,
					},
				});

		const result = {
			store: updatedStore,
			subscription: updatedSubscription,
		};

		transformPrismaDataForJson(result);

		logger.info("Admin updated store subscription", {
			metadata: {
				storeId,
				level,
				subscriptionId: subscriptionData.subscriptionId,
			},
			tags: ["sysAdmin", "subscription"],
		});

		return result;
	});
