"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteAnnouncementLocaleSchema } from "./delete-announcement-locale.validation";

export const deleteAnnouncementLocaleAction = storeActionClient
	.metadata({ name: "deleteAnnouncementLocale" })
	.schema(deleteAnnouncementLocaleSchema)
	.action(async ({ parsedInput: { id } }) => {
		return sqlClient.storeAnnouncementLocale.delete({ where: { id } });
	});
