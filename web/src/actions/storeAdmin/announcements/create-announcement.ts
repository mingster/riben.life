"use server";

import { mapAnnouncementToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/announcements/announcement-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { createAnnouncementSchema } from "./create-announcement.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const createAnnouncementAction = storeActionClient
	.metadata({ name: "createAnnouncement" })
	.schema(createAnnouncementSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { message } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const announcement = await sqlClient.storeAnnouncement.create({
			data: {
				storeId,
				message,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return {
			announcement: mapAnnouncementToColumn(announcement, storeId),
		};
	});
