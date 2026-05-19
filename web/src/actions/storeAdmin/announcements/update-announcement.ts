"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateAnnouncementSchema } from "./update-announcement.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const updateAnnouncementAction = storeActionClient
	.metadata({ name: "updateAnnouncement" })
	.schema(updateAnnouncementSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id, name, published } = parsedInput;

		const existing = await sqlClient.storeAnnouncement.findFirst({
			where: { id, storeId },
		});

		if (!existing) {
			throw new SafeError("Announcement not found");
		}

		const updated = await sqlClient.storeAnnouncement.update({
			where: { id },
			data: {
				name: name ?? null,
				published: published ?? false,
				updatedAt: getUtcNowEpoch(),
			},
			include: { locales: true },
		});

		return { announcement: updated };
	});
