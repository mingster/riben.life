"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { deleteAnnouncementSchema } from "./delete-announcement.validation";

export const deleteAnnouncementAction = storeOwnerActionClient
	.metadata({ name: "deleteAnnouncement" })
	.schema(deleteAnnouncementSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const existing = await sqlClient.storeAnnouncement.findFirst({
			where: {
				id,
				storeId,
			},
			select: { id: true },
		});

		if (!existing) {
			throw new SafeError("Announcement not found");
		}

		await sqlClient.storeAnnouncement.delete({
			where: { id },
		});

		return {
			id,
		};
	});
