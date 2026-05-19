"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { upsertAnnouncementLocaleSchema } from "./upsert-announcement-locale.validation";

export const upsertAnnouncementLocaleAction = storeActionClient
	.metadata({ name: "upsertAnnouncementLocale" })
	.schema(upsertAnnouncementLocaleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { messageId, localeId, message } = parsedInput;

		const announcement = await sqlClient.storeAnnouncement.findFirst({
			where: { id: messageId, storeId },
			select: { id: true },
		});

		if (!announcement) {
			throw new SafeError("Announcement not found");
		}

		return sqlClient.storeAnnouncementLocale.upsert({
			where: { messageId_localeId: { messageId, localeId } },
			create: { messageId, localeId, message },
			update: { message },
		});
	});
