"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStoreAdminSettingsSchema } from "./update-store-admin-settings.validation";

export const updateStoreAdminSettingsAction = storeActionClient
	.metadata({ name: "updateStoreAdminSettings" })
	.schema(updateStoreAdminSettingsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			storeName,
			storefrontFreeShippingMinimum,
			storefrontShippingEtaCopy,
			storefrontPickupLocationsJson,
		} = parsedInput;

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const now = getUtcNowEpoch();

		await sqlClient.$transaction(async (tx) => {
			await tx.store.update({
				where: { id: storeId },
				data: { name: storeName, updatedAt: now },
			});

			const existing = await tx.storeSettings.findUnique({
				where: { storeId },
			});

			const contentData = {
				storefrontFreeShippingMinimum,
				storefrontShippingEtaCopy: storefrontShippingEtaCopy ?? null,
				storefrontPickupLocationsJson,
			};

			if (existing) {
				await tx.storeSettings.update({
					where: { storeId },
					data: {
						...contentData,
						updatedAt: now,
					},
				});
			} else {
				await tx.storeSettings.create({
					data: {
						storeId,
						...contentData,
						createdAt: now,
						updatedAt: now,
					},
				});
			}
		});

		const updatedStore = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				name: true,
				updatedAt: true,
			},
		});

		const updatedSettings = await sqlClient.storeSettings.findUnique({
			where: { storeId },
		});

		transformPrismaDataForJson(updatedStore);
		transformPrismaDataForJson(updatedSettings);

		return {
			store: updatedStore,
			storeSettings: updatedSettings,
		};
	});
