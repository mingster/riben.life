"use server";

import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate } from "@prisma/client";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateMessageTemplateSchema } from "./update-message-template.validation";
import logger from "@/lib/logger";

export const updateMessageTemplateAction = storeActionClient
	.metadata({ name: "updateMessageTemplate" })
	.schema(updateMessageTemplateSchema)
	.action(
		async ({
			parsedInput: { id, name, templateType },
			bindArgsClientInputs,
		}) => {
			const storeId = bindArgsClientInputs[0] as string;

			logger.info("Updating message template", {
				metadata: {
					id,
					name,
					templateType,
					storeId,
				},
				tags: ["message-template", "store-admin", "update"],
			});

			// For store admin: isGlobal is always false, storeId is set from bindArgsClientInputs
			//if there's no id, this is a new object
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.messageTemplate.create({
					data: {
						name,
						templateType: templateType || "email",
						isGlobal: false, // Store templates are never global
						storeId, // Set from bindArgsClientInputs
					},
				});
				id = result.id;
			} else {
				// Check if this is a global template - if so, create a store-specific copy
				const existing = await sqlClient.messageTemplate.findUnique({
					where: { id },
					include: {
						MessageTemplateLocalized: true,
					},
				});

				if (!existing) {
					throw new Error("Template not found");
				}

				if (existing.isGlobal) {
					// Create a store-specific copy of the global template
					const newTemplate = await sqlClient.messageTemplate.create({
						data: {
							name,
							templateType: templateType || "email",
							isGlobal: false,
							storeId,
						},
					});

					// Copy all localized templates
					if (existing.MessageTemplateLocalized.length > 0) {
						await sqlClient.messageTemplateLocalized.createMany({
							data: existing.MessageTemplateLocalized.map((localized) => ({
								messageTemplateId: newTemplate.id,
								localeId: localized.localeId,
								subject: localized.subject,
								body: localized.body,
								bCCEmailAddresses: localized.bCCEmailAddresses,
								isActive: localized.isActive,
							})),
						});
					}

					id = newTemplate.id;
				} else {
					// Verify the template belongs to this store
					if (existing.storeId !== storeId) {
						throw new Error("Template does not belong to this store");
					}

					// Update existing store template
					await sqlClient.messageTemplate.update({
						where: { id },
						data: {
							name,
							templateType: templateType || "email",
							// isGlobal and storeId remain unchanged
						},
					});
				}
			}

			const result = (await sqlClient.messageTemplate.findFirst({
				where: { id },
				include: {
					MessageTemplateLocalized: true,
				},
			})) as MessageTemplate;

			return result;
		},
	);
