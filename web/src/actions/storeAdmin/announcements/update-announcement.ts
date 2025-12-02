"use server";

import { mapAnnouncementToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/announcements/announcement-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateAnnouncementSchema } from "./update-announcement.validation";

export const updateAnnouncementAction = storeActionClient
	.metadata({ name: "updateAnnouncement" })
	.schema(updateAnnouncementSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id, message } = parsedInput;

		const existing = await sqlClient.storeAnnouncement.findFirst({
			where: {
				id,
				storeId,
			},
		});

		if (!existing) {
			throw new SafeError("Announcement not found");
		}

		const updated = await sqlClient.storeAnnouncement.update({
			where: { id },
			data: {
				message,
			},
		});

		return {
			announcement: mapAnnouncementToColumn(updated, storeId),
		};
	});
