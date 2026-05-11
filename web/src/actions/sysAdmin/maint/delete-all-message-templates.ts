"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

export const deleteAllMessageTemplates = async () => {
	const localizedCount = await sqlClient.messageTemplateLocalized.deleteMany({
		where: {},
	});
	const templateCount = await sqlClient.messageTemplate.deleteMany({
		where: {},
	});

	logger.info("Deleted all message templates", {
		metadata: {
			localizedCount: localizedCount.count,
			templateCount: templateCount.count,
		},
		tags: ["action", "maintenance", "message-templates"],
	});

	return {
		localizedCount: localizedCount.count,
		templateCount: templateCount.count,
	};
};
