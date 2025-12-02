"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteAnnouncementSchema } from "./delete-announcement.validation";

export const deleteAnnouncementAction = storeActionClient
	.metadata({ name: "deleteAnnouncement" })
	.schema(deleteAnnouncementSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

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
