"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateMessageTemplateLocalizedSchema } from "./update-message-template-localized.validation";

export const updateMessageTemplateLocalizedAction = adminActionClient
	.metadata({ name: "updateMessageTemplateLocalized" })
	.schema(updateMessageTemplateLocalizedSchema)
	.action(
		async ({
			parsedInput: {
				id,
				messageTemplateId,
				localeId,
				bCCEmailAddresses,
				subject,
				body,
				isActive,
			},
		}) => {
			console.log(
				"updateMessageTemplateLocalizedAction",
				id,
				messageTemplateId,
				localeId,
				bCCEmailAddresses,
				subject,
				body,
				isActive,
			);

			//if there's no id, this is a new object
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				//create new message template localized
				const newMessageTemplateLocalized =
					await sqlClient.messageTemplateLocalized.create({
						data: {
							messageTemplateId,
							localeId,
							bCCEmailAddresses: bCCEmailAddresses || "",
							subject,
							body,
							isActive,
						},
					});
				id = newMessageTemplateLocalized.id;
			} else {
				//update existing message template localized
				await sqlClient.messageTemplateLocalized.update({
					where: { id },
					data: {
						messageTemplateId,
						localeId,
						bCCEmailAddresses: bCCEmailAddresses || "",
						subject,
						body,
						isActive,
					},
				});
			}

			const result = await sqlClient.messageTemplateLocalized.findFirst({
				where: { id },
			});

			return result;
		},
	);
