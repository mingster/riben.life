"use server";
import { sqlClient } from "@/lib/prismadb";

import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNow } from "@/utils/datetime-utils";
import { updateSystemMessageSchema } from "./update-system-message.validation";

export const updateSystemMessageAction = adminActionClient
	.metadata({ name: "updateSystemMessage" })
	.schema(updateSystemMessageSchema)
	.action(async ({ parsedInput: { id, localeId, message, published } }) => {
		//if there's no id, then this is a new message
		//
		if (id === undefined || id === null || id === "" || id === "new") {
			const result = await sqlClient.systemMessage.create({
				data: { localeId, message, published, createdOn: getUtcNow() },
			});
			return result;
		}

		const result = await sqlClient.systemMessage.update({
			where: { id },
			data: { localeId, message, published, createdOn: getUtcNow() },
		});
		return result;
	});
