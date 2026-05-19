"use server";

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
		const { name, published } = parsedInput;

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
				name: name ?? null,
				published: published ?? false,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
			include: { locales: true },
		});

		return { announcement };
	});
