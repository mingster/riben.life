import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { promises as fs } from "fs";
import path from "path";
import logger from "@/lib/logger";
import { CheckAdminApiAccess } from "../../api_helper";

export async function POST(req: Request) {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	const log = logger.child({ module: "message-template-import" });
	let fileName;

	try {
		({ fileName } = await req.json());
		if (!fileName) {
			return NextResponse.json(
				{ success: false, error: "fileName is required" },
				{ status: 400 },
			);
		}

		const filePath = path.join(process.cwd(), "public", "backup", fileName);
		const fileContent = await fs.readFile(filePath, "utf8");
		const messageTemplates = JSON.parse(fileContent);

		// Group templates by ID to handle duplicates (same template with different locales)
		// This ensures we process each template once with all its localizations
		const templateMap = new Map<
			string,
			{
				id: string;
				name: string;
				templateType: string;
				isGlobal: boolean;
				storeId: string | null;
				localizations: Array<{
					id: string;
					messageTemplateId: string;
					localeId: string;
					bCCEmailAddresses: string | null;
					subject: string;
					body: string;
					isActive: boolean;
				}>;
			}
		>();

		// Collect all templates and merge their localizations
		// When duplicates exist, prefer non-null values and true for isGlobal
		for (const messageTemplate of messageTemplates) {
			const templateId = messageTemplate.id;
			const existing = templateMap.get(templateId);

			if (existing) {
				// Merge localizations from duplicate entries
				if (Array.isArray(messageTemplate.MessageTemplateLocalized)) {
					existing.localizations.push(
						...messageTemplate.MessageTemplateLocalized,
					);
				}
				// Resolve metadata conflicts: prefer non-null and more permissive values
				if (messageTemplate.storeId && !existing.storeId) {
					existing.storeId = messageTemplate.storeId;
				}
				// Prefer isGlobal: true if any occurrence has it (more permissive)
				if (messageTemplate.isGlobal === true) {
					existing.isGlobal = true;
				}
				// Prefer non-empty templateType
				if (
					messageTemplate.templateType &&
					messageTemplate.templateType !== "email"
				) {
					existing.templateType = messageTemplate.templateType;
				}
			} else {
				// First occurrence of this template
				templateMap.set(templateId, {
					id: templateId,
					name: messageTemplate.name,
					templateType: messageTemplate.templateType || "email",
					isGlobal: messageTemplate.isGlobal ?? false,
					storeId: messageTemplate.storeId || null,
					localizations: Array.isArray(messageTemplate.MessageTemplateLocalized)
						? [...messageTemplate.MessageTemplateLocalized]
						: [],
				});
			}
		}

		// Process each unique template once with all its localizations
		for (const [templateId, template] of templateMap) {
			// Upsert message template (only once per template ID)
			await sqlClient.messageTemplate.upsert({
				where: { id: templateId },
				update: {
					name: template.name,
					templateType: template.templateType,
					isGlobal: template.isGlobal,
					storeId: template.storeId,
				},
				create: {
					id: templateId,
					name: template.name,
					templateType: template.templateType,
					isGlobal: template.isGlobal,
					storeId: template.storeId,
				},
			});

			// Process all localizations for this template
			for (const messageTemplateLocalized of template.localizations) {
				// The localeId in backup might be the language code (lng) like "tw", "en", "ja"
				// or the full locale ID like "zh-TW", "en-US", "ja-JP"
				// Try to find locale by ID first, then by lng if not found
				let locale = await sqlClient.locale.findUnique({
					where: { id: messageTemplateLocalized.localeId },
				});

				// If not found by ID, try to find by lng (language code)
				if (!locale) {
					const localesByLng = await sqlClient.locale.findMany({
						where: { lng: messageTemplateLocalized.localeId },
					});
					if (localesByLng.length > 0) {
						locale = localesByLng[0]; // Use the first match
						log.info(
							`Locale found by lng: ${messageTemplateLocalized.localeId} -> ${locale.id}`,
							{
								metadata: {
									backupLocaleId: messageTemplateLocalized.localeId,
									actualLocaleId: locale.id,
									templateId: templateId,
								},
								tags: ["import", "locale", "mapping"],
							},
						);
					}
				}

				if (!locale) {
					log.warn(
						`Locale not found: ${messageTemplateLocalized.localeId}. Skipping localization.`,
						{
							metadata: {
								localeId: messageTemplateLocalized.localeId,
								templateId: templateId,
								localizedId: messageTemplateLocalized.id,
							},
							tags: ["import", "locale", "warning"],
						},
					);
					continue; // Skip this localization if locale doesn't exist
				}

				try {
					await sqlClient.messageTemplateLocalized.upsert({
						where: { id: messageTemplateLocalized.id },
						update: {
							bCCEmailAddresses:
								messageTemplateLocalized.bCCEmailAddresses || null,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive ?? true,
							localeId: locale.id, // Use the actual locale ID from database
						},
						create: {
							id: messageTemplateLocalized.id,
							messageTemplateId: templateId,
							localeId: locale.id, // Use the actual locale ID from database
							bCCEmailAddresses:
								messageTemplateLocalized.bCCEmailAddresses || null,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive ?? true,
						},
					});
					log.info(
						`Successfully imported MessageTemplateLocalized: ${messageTemplateLocalized.id}`,
						{
							metadata: {
								localizedId: messageTemplateLocalized.id,
								templateId: templateId,
								localeId: locale.id,
							},
							tags: ["import", "success"],
						},
					);
				} catch (error: any) {
					log.error(
						`Failed to upsert MessageTemplateLocalized: ${messageTemplateLocalized.id}`,
						{
							metadata: {
								error: error instanceof Error ? error.message : String(error),
								stack: error instanceof Error ? error.stack : undefined,
								localizedId: messageTemplateLocalized.id,
								templateId: templateId,
								localeId: locale.id,
							},
							tags: ["import", "error"],
						},
					);
					// Continue with next localization instead of failing entire import
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		log.error(error, {
			message: "Failed to import message templates",
			metadata: { fileName: fileName },
			tags: ["message-template", "import", "error"],
			service: "message-template-import",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return NextResponse.json(
			{ success: false, error: error?.message || "Unknown error" },
			{ status: 500 },
		);
	}
}
