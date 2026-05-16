"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { updateSystemMessageSchema } from "./update-system-message.validation";

export const updateSystemMessageAction = adminActionClient
	.metadata({ name: "updateSystemMessage" })
	.schema(updateSystemMessageSchema)
	.action(async ({ parsedInput: { id, name, published } }) => {
		const now = getUtcNowEpoch();
		if (!id || id === "new") {
			return sqlClient.systemMessage.create({
				data: { name, published, createdOn: now, updatedOn: now },
				include: { locales: true },
			});
		}
		return sqlClient.systemMessage.update({
			where: { id },
			data: { name, published, updatedOn: now },
			include: { locales: true },
		});
	});
