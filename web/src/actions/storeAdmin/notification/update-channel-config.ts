"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateChannelConfigSchema } from "./update-channel-config.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";

export const updateChannelConfigAction = storeActionClient
	.metadata({ name: "updateChannelConfig" })
	.schema(updateChannelConfigSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { channel, enabled, credentials, settings } = parsedInput;

		logger.info("Updating notification channel config", {
			metadata: {
				storeId,
				channel,
				enabled,
			},
			tags: ["notification", "channel-config", "update"],
		});

		// Check if config exists
		const existingConfig = await sqlClient.notificationChannelConfig.findUnique(
			{
				where: {
					storeId_channel: {
						storeId,
						channel,
					},
				},
			},
		);

		// Serialize credentials and settings to JSON strings
		const credentialsJson = credentials ? JSON.stringify(credentials) : null;
		const settingsJson = settings ? JSON.stringify(settings) : null;

		if (existingConfig) {
			// Update existing config
			const updated = await sqlClient.notificationChannelConfig.update({
				where: {
					storeId_channel: {
						storeId,
						channel,
					},
				},
				data: {
					enabled,
					credentials: credentialsJson,
					settings: settingsJson,
					updatedAt: getUtcNowEpoch(),
				},
			});

			return updated;
		} else {
			// Create new config
			const created = await sqlClient.notificationChannelConfig.create({
				data: {
					storeId,
					channel,
					enabled,
					credentials: credentialsJson,
					settings: settingsJson,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});

			return created;
		}
	});
