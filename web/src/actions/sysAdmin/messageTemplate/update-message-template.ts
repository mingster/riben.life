"use server";

import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate } from "@prisma/client";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateMessageTemplateSchema } from "./update-message-template.validation";

export const updateMessageTemplateAction = adminActionClient
	.metadata({ name: "updateMessageTemplate" })
	.schema(updateMessageTemplateSchema)
	.action(async ({ parsedInput: { id, name } }) => {
		console.log("id", id);

		//if there's no id, this is a new object
		//
		if (id === undefined || id === null || id === "" || id === "new") {
			const result = await sqlClient.messageTemplate.create({
				data: { name },
			});
			id = result.id;
		} else {
			await sqlClient.messageTemplate.update({
				where: { id },
				data: { name },
			});
		}

		const result = (await sqlClient.messageTemplate.findFirst({
			where: { id },
			include: {
				MessageTemplateLocalized: true,
			},
		})) as MessageTemplate;

		return result;
	});
