"use server";

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { assertSmsTemplateBodyLength } from "@/utils/sms-body-length";
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
				translationStatus,
				sourceLocaleId,
			},
		}) => {
			logger.info("updateMessageTemplateLocalizedAction", {
				metadata: {
					id,
					messageTemplateId,
					localeId,
					isActive,
					translationStatus,
				},
				tags: ["sysadmin", "message-template-localized", "upsert"],
			});

			const parentTemplate = await sqlClient.messageTemplate.findUnique({
				where: { id: messageTemplateId },
				select: { templateType: true },
			});

			if (!parentTemplate) {
				throw new Error("Parent template not found");
			}

			assertSmsTemplateBodyLength(parentTemplate.templateType, body);

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
							translationStatus,
							sourceLocaleId: sourceLocaleId || null,
							lastTranslatedAt: getUtcNowEpoch(),
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
						translationStatus,
						sourceLocaleId: sourceLocaleId || null,
						lastTranslatedAt: getUtcNowEpoch(),
					},
				});
			}

			const result = await sqlClient.messageTemplateLocalized.findFirst({
				where: { id },
			});

			return result;
		},
	);
