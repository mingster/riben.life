"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import {
	updateUserPreferencesSchema,
	type UpdateUserPreferencesInput,
} from "./update-user-preferences.validation";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

export const updateUserPreferencesAction = userRequiredActionClient
	.metadata({ name: "updateUserPreferences" })
	.schema(updateUserPreferencesSchema)
	.action(async ({ parsedInput, ctx }) => {
		const userId = ctx.userId;
		const { storeId, ...preferences } = parsedInput;

		logger.info("Updating user notification preferences", {
			metadata: {
				userId,
				storeId: storeId || "global",
				preferences,
			},
			tags: ["notification", "user", "preferences", "update"],
		});

		// If storeId is provided, verify the user has access to that store
		if (storeId) {
			const store = await sqlClient.store.findFirst({
				where: {
					id: storeId,
					OR: [
						{ ownerId: userId },
						{
							Organization: {
								members: {
									some: {
										userId,
									},
								},
							},
						},
					],
					isDeleted: false,
				},
			});

			if (!store) {
				throw new SafeError("Store not found or access denied");
			}
		}

		const now = getUtcNowEpoch();

		// Find existing preferences
		const existing = await sqlClient.notificationPreferences.findFirst({
			where: {
				userId,
				storeId: storeId || null,
			},
		});

		if (existing) {
			// Update existing preferences
			const updated = await sqlClient.notificationPreferences.update({
				where: { id: existing.id },
				data: {
					...preferences,
					updatedAt: now,
				},
			});

			logger.info("User notification preferences updated", {
				metadata: {
					userId,
					storeId: storeId || "global",
					preferenceId: updated.id,
				},
				tags: ["notification", "user", "preferences", "updated"],
			});

			return { preferences: updated };
		} else {
			// Create new preferences
			const created = await sqlClient.notificationPreferences.create({
				data: {
					userId,
					storeId: storeId || null,
					...preferences,
					createdAt: now,
					updatedAt: now,
				},
			});

			logger.info("User notification preferences created", {
				metadata: {
					userId,
					storeId: storeId || "global",
					preferenceId: created.id,
				},
				tags: ["notification", "user", "preferences", "created"],
			});

			return { preferences: created };
		}
	});
