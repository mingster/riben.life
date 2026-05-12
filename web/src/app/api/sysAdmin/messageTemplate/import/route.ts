import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { promises as fs } from "fs";
import path from "path";
import logger from "@/lib/logger";
import { CheckAdminApiAccess } from "../../api_helper";
import { createHash } from "node:crypto";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

/** Accepts Prisma-shaped exports, plain arrays, or `{ messageTemplates }` / `{ data }` wrappers. */
function parseMessageTemplatesRoot(parsed: unknown): unknown[] {
	if (Array.isArray(parsed)) {
		return parsed;
	}
	if (parsed && typeof parsed === "object") {
		const o = parsed as Record<string, unknown>;
		if (o.lifecycleSeedV2 && typeof o.lifecycleSeedV2 === "object") {
			return expandLifecycleSeedV2(
				o.lifecycleSeedV2 as Record<string, unknown>,
			);
		}
		if (Array.isArray(o.messageTemplates)) {
			return o.messageTemplates;
		}
		if (Array.isArray(o.data)) {
			return o.data;
		}
		if (Array.isArray(o.templates)) {
			return o.templates;
		}
	}
	throw new Error(
		"Invalid JSON: expected an array of templates, or an object with messageTemplates / data / templates array",
	);
}

function deterministicId(seed: string): string {
	return createHash("sha1").update(seed).digest("hex").slice(0, 32);
}

function lifecycleSeedRecipientLabel(
	recipientLabels: Record<string, Record<string, string>> | undefined,
	localeId: string,
	recipient: string,
): string {
	const label = recipientLabels?.[localeId]?.[recipient];
	if (typeof label === "string" && label.trim() !== "") {
		return label;
	}
	return recipient;
}

function expandLifecyclePlaceholderString(
	raw: string,
	ctx: {
		domain: string;
		event: string;
		recipient: string;
		channel: string;
		localeId: string;
		recipientLabel: string;
	},
): string {
	return raw
		.replaceAll("{{domain}}", ctx.domain)
		.replaceAll("{{event}}", ctx.event)
		.replaceAll("{{recipient}}", ctx.recipient)
		.replaceAll("{{recipientLabel}}", ctx.recipientLabel)
		.replaceAll("{{channel}}", ctx.channel);
}

function expandLifecycleSeedV2(seed: Record<string, unknown>): unknown[] {
	const domains = (seed.domains as Record<string, string[]>) ?? {};
	const recipients = (seed.recipients as string[]) ?? [];
	const channels = (seed.channels as string[]) ?? [];
	const locales = (seed.locales as string[]) ?? [];
	const templates =
		(seed.templates as Record<string, { subject?: string; body?: string }>) ??
		{};
	const recipientLabels = seed.recipientLabels as
		| Record<string, Record<string, string>>
		| undefined;

	const records: unknown[] = [];
	for (const [domain, events] of Object.entries(domains)) {
		for (const event of events) {
			for (const recipient of recipients) {
				for (const channel of channels) {
					const name = `${domain}.${event}.${recipient}.${channel}`;
					const templateId = deterministicId(`tpl:${name}`);
					const localizations = locales.map((localeId) => {
						const localeTemplate = templates[localeId] ?? {};
						const recipientLabel = lifecycleSeedRecipientLabel(
							recipientLabels,
							localeId,
							recipient,
						);
						const ctx = {
							domain,
							event,
							recipient,
							channel,
							localeId,
							recipientLabel,
						};
						return {
							id: deterministicId(`loc:${name}:${localeId}`),
							messageTemplateId: templateId,
							localeId,
							bCCEmailAddresses: null,
							subject: expandLifecyclePlaceholderString(
								localeTemplate.subject ?? "",
								ctx,
							),
							body: expandLifecyclePlaceholderString(
								localeTemplate.body ?? "",
								ctx,
							),
							isActive: true,
						};
					});
					records.push({
						id: templateId,
						name,
						templateType: channel,
						isGlobal: true,
						storeId: null,
						MessageTemplateLocalized: localizations,
					});
				}
			}
		}
	}

	return records;
}

/** Supports Prisma relation name and common camelCase / alias keys from exports or hand-edited files. */
function getLocalizedRows(template: Record<string, unknown>): unknown[] {
	const raw =
		template.MessageTemplateLocalized ??
		template.messageTemplateLocalized ??
		template.localizations ??
		template.MessageTemplateLocalizations;
	if (Array.isArray(raw)) {
		return raw;
	}
	return [];
}

type TemplateLocalizationInput = {
	id: string;
	messageTemplateId: string;
	localeId: string;
	bCCEmailAddresses: string | null;
	subject: string;
	body: string;
	isActive: boolean;
	translationStatus: string;
	sourceLocaleId: string | null;
	lastTranslatedAt: bigint | null;
};

function normalizeLocalizationRaw(
	raw: unknown,
	templateId: string,
): TemplateLocalizationInput | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const r = raw as Record<string, unknown>;
	const id = String(r.id ?? "").trim();
	const localeId = String(r.localeId ?? r["locale_id"] ?? "").trim();
	if (!id || !localeId) {
		return null;
	}
	const bcc = r.bCCEmailAddresses;
	const bccStr = bcc == null || bcc === "" ? null : String(bcc).trim() || null;

	return {
		id,
		messageTemplateId: String(r.messageTemplateId ?? templateId),
		localeId,
		bCCEmailAddresses: bccStr,
		subject: String(r.subject ?? ""),
		body: String(r.body ?? ""),
		isActive: Boolean(r.isActive ?? true),
		translationStatus: String(r.translationStatus ?? "approved"),
		sourceLocaleId:
			r.sourceLocaleId == null || String(r.sourceLocaleId).trim() === ""
				? null
				: String(r.sourceLocaleId),
		lastTranslatedAt:
			r.lastTranslatedAt == null || r.lastTranslatedAt === ""
				? null
				: BigInt(String(r.lastTranslatedAt)),
	};
}

function hasValidTemplateSyntax(template: string): boolean {
	const openBraces = (template.match(/\{\{/g) || []).length;
	const closeBraces = (template.match(/\}\}/g) || []).length;
	if (openBraces !== closeBraces) return false;
	const matches = template.match(/\{\{[^}]+\}\}/g);
	if (!matches) return true;
	return matches.every((match) => /^\{\{\w+(?:\.\w+)*\}\}$/.test(match));
}

export async function POST(req: Request) {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	const log = logger.child({ module: "message-template-import" });
	let fileName: string | undefined;

	try {
		({ fileName } = (await req.json()) as { fileName?: string });
		if (!fileName || typeof fileName !== "string") {
			return NextResponse.json(
				{ success: false, error: "fileName is required" },
				{ status: 400 },
			);
		}

		const backupDir = path.resolve(process.cwd(), "public", "backup");
		const safeBase = path.basename(fileName.trim());
		if (
			!safeBase ||
			safeBase !== fileName.trim() ||
			!safeBase.endsWith(".json") ||
			safeBase.includes("..")
		) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Invalid fileName: use a .json file name only (no paths), e.g. message-template-backup-20251217-143044.json",
				},
				{ status: 400 },
			);
		}

		const filePath = path.resolve(backupDir, safeBase);
		if (!filePath.startsWith(backupDir + path.sep) && filePath !== backupDir) {
			return NextResponse.json(
				{ success: false, error: "Invalid backup path" },
				{ status: 400 },
			);
		}

		let fileContent = await fs.readFile(filePath, "utf8");
		if (fileContent.charCodeAt(0) === 0xfeff) {
			fileContent = fileContent.slice(1);
		}

		const parsed = JSON.parse(fileContent) as unknown;
		const messageTemplates = parseMessageTemplatesRoot(parsed);
		const requiredLocales = await sqlClient.locale.findMany({
			select: { id: true, lng: true },
			orderBy: { id: "asc" },
		});

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
				localizations: TemplateLocalizationInput[];
			}
		>();

		// Collect all templates and merge their localizations
		// When duplicates exist, prefer non-null values and true for isGlobal
		for (const rawTemplate of messageTemplates) {
			const messageTemplate = rawTemplate as Record<string, unknown>;
			const templateId = messageTemplate.id as string | undefined;
			if (!templateId || typeof templateId !== "string") {
				log.warn("Skipping template entry without string id", {
					metadata: { name: messageTemplate.name },
					tags: ["import", "skip"],
				});
				continue;
			}
			const existing = templateMap.get(templateId);
			const localizedRows = getLocalizedRows(messageTemplate)
				.map((row) => normalizeLocalizationRaw(row, templateId))
				.filter((row): row is TemplateLocalizationInput => row != null);

			if (existing) {
				// Merge localizations from duplicate entries
				if (localizedRows.length > 0) {
					existing.localizations.push(...localizedRows);
				}
				// Resolve metadata conflicts: prefer non-null and more permissive values
				const sid = messageTemplate.storeId as string | null | undefined;
				if (sid && !existing.storeId) {
					existing.storeId = sid;
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
					existing.templateType = String(messageTemplate.templateType);
				}
			} else {
				// First occurrence of this template
				templateMap.set(templateId, {
					id: templateId,
					name: String(messageTemplate.name ?? ""),
					templateType: String(messageTemplate.templateType || "email"),
					isGlobal: Boolean(messageTemplate.isGlobal ?? false),
					storeId:
						(messageTemplate.storeId as string | null | undefined) ?? null,
					localizations: localizedRows,
				});
			}
		}

		for (const [templateId, template] of templateMap) {
			const templateLocaleIds = new Set(
				template.localizations.map((item) => item.localeId),
			);
			for (const locale of requiredLocales) {
				const hasLocale =
					templateLocaleIds.has(locale.id) || templateLocaleIds.has(locale.lng);
				if (!hasLocale) {
					throw new Error(
						`Template ${templateId} is missing required locale ${locale.id}`,
					);
				}
			}
			for (const localization of template.localizations) {
				if (!hasValidTemplateSyntax(localization.subject)) {
					throw new Error(
						`Invalid subject template syntax for ${templateId}:${localization.localeId}`,
					);
				}
				if (!hasValidTemplateSyntax(localization.body)) {
					throw new Error(
						`Invalid body template syntax for ${templateId}:${localization.localeId}`,
					);
				}
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
							messageTemplateId: templateId,
							localeId: locale.id,
							bCCEmailAddresses:
								messageTemplateLocalized.bCCEmailAddresses ?? null,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive,
							translationStatus:
								messageTemplateLocalized.translationStatus || "approved",
							sourceLocaleId: messageTemplateLocalized.sourceLocaleId,
							lastTranslatedAt:
								messageTemplateLocalized.lastTranslatedAt ?? getUtcNowEpoch(),
						},
						create: {
							id: messageTemplateLocalized.id,
							messageTemplateId: templateId,
							localeId: locale.id,
							bCCEmailAddresses:
								messageTemplateLocalized.bCCEmailAddresses ?? null,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive,
							translationStatus:
								messageTemplateLocalized.translationStatus || "approved",
							sourceLocaleId: messageTemplateLocalized.sourceLocaleId,
							lastTranslatedAt:
								messageTemplateLocalized.lastTranslatedAt ?? getUtcNowEpoch(),
						},
					});
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
