"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateStorePreferencesSchema } from "./update-store-preferences.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";

export const updateStorePreferencesAction = storeActionClient
	.metadata({ name: "updateStorePreferences" })
	.schema(updateStorePreferencesSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		logger.info("Updating store notification preferences", {
			metadata: {
				storeId,
				...parsedInput,
			},
			tags: ["notification", "preferences", "store"],
		});

		// Find or create store default preferences (userId is null for store defaults)
		const existing = await sqlClient.notificationPreferences.findFirst({
			where: {
				storeId,
				userId: null,
			},
		});

		const now = getUtcNowEpoch();

		if (existing) {
			// Update existing preferences
			const updated = await sqlClient.notificationPreferences.update({
				where: { id: existing.id },
				data: {
					...parsedInput,
					updatedAt: now,
				},
			});

			return { preferences: updated };
		} else {
			// Create new preferences
			const created = await sqlClient.notificationPreferences.create({
				data: {
					storeId,
					userId: null, // null = store default preferences
					...parsedInput,
					createdAt: now,
					updatedAt: now,
				},
			});

			return { preferences: created };
		}
	});
