"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";

const deleteLocaleSchema = z.object({
	id: z.string().min(1, "Locale ID is required"),
});

export const deleteLocaleAction = adminActionClient
	.metadata({ name: "deleteLocale" })
	.schema(deleteLocaleSchema)
	.action(async ({ parsedInput: { id } }) => {
		logger.info("deleteLocaleAction", {
			metadata: { id },
			tags: ["locale", "delete"],
		});

		// Check if locale is referenced by other tables
		const [systemMessages, messageTemplateLocalized] = await Promise.all([
			sqlClient.systemMessage.count({
				where: { localeId: id },
			}),
			sqlClient.messageTemplateLocalized.count({
				where: { localeId: id },
			}),
		]);

		if (systemMessages > 0 || messageTemplateLocalized > 0) {
			throw new Error(
				`Cannot delete locale: it is referenced by ${systemMessages} system messages and ${messageTemplateLocalized} message template localizations`,
			);
		}

		await sqlClient.locale.delete({
			where: { id },
		});

		return { success: true };
	});
