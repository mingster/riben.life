"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import logger from "@/lib/logger";

export const updateMessageTemplateLocalizedAction = storeActionClient
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
			bindArgsClientInputs,
		}) => {
			const storeId = bindArgsClientInputs[0] as string;

			logger.info("Updating message template localized", {
				metadata: {
					id,
					messageTemplateId,
					localeId,
					storeId,
				},
				tags: ["message-template-localized", "store-admin", "update"],
			});

			// Check if the parent template is global - if so, create a store copy first
			const parentTemplate = await sqlClient.messageTemplate.findUnique({
				where: { id: messageTemplateId },
			});

			if (!parentTemplate) {
				throw new Error("Parent template not found");
			}

			let targetTemplateId = messageTemplateId;

			// If editing a localized template for a global template, create a store copy first
			if (parentTemplate.isGlobal) {
				// Check if a store copy already exists
				const existingStoreCopy = await sqlClient.messageTemplate.findFirst({
					where: {
						storeId,
						name: parentTemplate.name,
						isGlobal: false,
					},
				});

				if (existingStoreCopy) {
					// Use existing store copy
					targetTemplateId = existingStoreCopy.id;
				} else {
					// Create a new store copy of the global template
					const newTemplate = await sqlClient.messageTemplate.create({
						data: {
							name: parentTemplate.name,
							templateType: parentTemplate.templateType,
							isGlobal: false,
							storeId,
						},
					});

					// Copy all existing localized templates
					const existingLocalized =
						await sqlClient.messageTemplateLocalized.findMany({
							where: { messageTemplateId: parentTemplate.id },
						});

					if (existingLocalized.length > 0) {
						await sqlClient.messageTemplateLocalized.createMany({
							data: existingLocalized.map((localized) => ({
								messageTemplateId: newTemplate.id,
								localeId: localized.localeId,
								subject: localized.subject,
								body: localized.body,
								bCCEmailAddresses: localized.bCCEmailAddresses,
								isActive: localized.isActive,
							})),
						});
					}

					targetTemplateId = newTemplate.id;
				}
			} else {
				// Verify the template belongs to this store
				if (parentTemplate.storeId !== storeId) {
					throw new Error("Template does not belong to this store");
				}
			}

			//if there's no id, this is a new object
			if (id === undefined || id === null || id === "" || id === "new") {
				//create new message template localized
				const newMessageTemplateLocalized =
					await sqlClient.messageTemplateLocalized.create({
						data: {
							messageTemplateId: targetTemplateId,
							localeId,
							bCCEmailAddresses: bCCEmailAddresses || "",
							subject,
							body,
							isActive,
						},
					});
				return newMessageTemplateLocalized;
			} else {
				// Check if the localized template belongs to a store template
				const existingLocalized =
					await sqlClient.messageTemplateLocalized.findUnique({
						where: { id },
						include: {
							MessageTemplate: true,
						},
					});

				if (!existingLocalized) {
					throw new Error("Localized template not found");
				}

				// If the parent template is global, we need to update the store copy
				if (existingLocalized.MessageTemplate.isGlobal) {
					// Find or create store copy
					let storeCopy = await sqlClient.messageTemplate.findFirst({
						where: {
							storeId,
							name: existingLocalized.MessageTemplate.name,
							isGlobal: false,
						},
					});

					if (!storeCopy) {
						// Create store copy if it doesn't exist
						storeCopy = await sqlClient.messageTemplate.create({
							data: {
								name: existingLocalized.MessageTemplate.name,
								templateType: existingLocalized.MessageTemplate.templateType,
								isGlobal: false,
								storeId,
							},
						});

						// Copy all existing localized templates from global template
						const allGlobalLocalized =
							await sqlClient.messageTemplateLocalized.findMany({
								where: {
									messageTemplateId: existingLocalized.MessageTemplate.id,
								},
							});

						if (allGlobalLocalized.length > 0) {
							await sqlClient.messageTemplateLocalized.createMany({
								data: allGlobalLocalized.map((localized) => ({
									messageTemplateId: storeCopy!.id,
									localeId: localized.localeId,
									subject: localized.subject,
									body: localized.body,
									bCCEmailAddresses: localized.bCCEmailAddresses,
									isActive: localized.isActive,
								})),
							});
						}
					}

					if (!storeCopy) {
						throw new Error("Failed to create store copy");
					}

					// Check if localized already exists in store copy
					const storeLocalized =
						await sqlClient.messageTemplateLocalized.findFirst({
							where: {
								messageTemplateId: storeCopy.id,
								localeId,
							},
						});

					if (storeLocalized) {
						// Update existing store localized
						return await sqlClient.messageTemplateLocalized.update({
							where: { id: storeLocalized.id },
							data: {
								localeId,
								bCCEmailAddresses: bCCEmailAddresses || "",
								subject,
								body,
								isActive,
							},
						});
					} else {
						// Create new localized in store copy
						return await sqlClient.messageTemplateLocalized.create({
							data: {
								messageTemplateId: storeCopy.id,
								localeId,
								bCCEmailAddresses: bCCEmailAddresses || "",
								subject,
								body,
								isActive,
							},
						});
					}
				} else {
					// Verify it belongs to this store
					if (existingLocalized.MessageTemplate.storeId !== storeId) {
						throw new Error("Localized template does not belong to this store");
					}

					// Update existing localized template
					return await sqlClient.messageTemplateLocalized.update({
						where: { id },
						data: {
							messageTemplateId: targetTemplateId,
							localeId,
							bCCEmailAddresses: bCCEmailAddresses || "",
							subject,
							body,
							isActive,
						},
					});
				}
			}
		},
	);
