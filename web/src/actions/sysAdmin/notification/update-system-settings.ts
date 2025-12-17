"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateSystemNotificationSettingsSchema } from "./update-system-settings.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import logger from "@/lib/logger";

export const updateSystemNotificationSettingsAction = adminActionClient
	.metadata({ name: "updateSystemNotificationSettings" })
	.schema(updateSystemNotificationSettingsSchema)
	.action(
		async ({
			parsedInput: {
				id,
				notificationsEnabled,
				maxRetryAttempts,
				retryBackoffMs,
				queueBatchSize,
				rateLimitPerMinute,
				historyRetentionDays,
			},
		}) => {
			// Get current admin user ID
			const session = await auth.api.getSession({
				headers: await headers(),
			});
			const updatedBy = session?.user?.id || "unknown";

			logger.info("Updating system notification settings", {
				metadata: {
					id,
					notificationsEnabled,
					updatedBy,
				},
				tags: ["notification", "settings", "update"],
			});

			// SystemNotificationSettings is a singleton - only one record exists
			if (id === undefined || id === null || id === "" || id === "new") {
				// Create new settings (should only happen once)
				const newSettings = await sqlClient.systemNotificationSettings.create({
					data: {
						notificationsEnabled,
						maxRetryAttempts,
						retryBackoffMs,
						queueBatchSize,
						rateLimitPerMinute,
						historyRetentionDays,
						updatedAt: getUtcNowEpoch(),
						updatedBy,
					},
				});
				return newSettings;
			} else {
				// Update existing settings
				const updated = await sqlClient.systemNotificationSettings.update({
					where: { id },
					data: {
						notificationsEnabled,
						maxRetryAttempts,
						retryBackoffMs,
						queueBatchSize,
						rateLimitPerMinute,
						historyRetentionDays,
						updatedAt: getUtcNowEpoch(),
						updatedBy,
					},
				});
				return updated;
			}
		},
	);
