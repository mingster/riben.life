import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { formatSmsBodyLengthError } from "@/utils/sms-body-length";

interface TemplateLocalizationInput {
	id?: string;
	messageTemplateId: string;
	localeId: string;
	bCCEmailAddresses: string | null;
	subject: string;
	body: string;
	isActive: boolean;
	translationStatus: string;
	sourceLocaleId: string | null;
	lastTranslatedAt: bigint | null;
}

interface TemplateInput {
	id?: string;
	name: string;
	templateType: string;
	isGlobal: boolean;
	storeId: string | null;
	localizations: TemplateLocalizationInput[];
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

function expandLifecycleSeedV2(seed: Record<string, unknown>): TemplateInput[] {
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

	const records: TemplateInput[] = [];
	for (const [domain, events] of Object.entries(domains)) {
		for (const event of events) {
			for (const recipient of recipients) {
				for (const channel of channels) {
					const name = `${domain}.${event}.${recipient}.${channel}`;
					const templateId = deterministicId(`tpl:${name}`);
					const localizations: TemplateLocalizationInput[] = locales.map(
						(localeId) => {
							const localeTemplate = templates[localeId] ?? {};
							const recipientLabel = lifecycleSeedRecipientLabel(
								recipientLabels,
								localeId,
								recipient,
							);
							const ctx = { domain, event, recipient, channel, recipientLabel };
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
								translationStatus: "approved",
								sourceLocaleId: null,
								lastTranslatedAt: null,
							};
						},
					);
					records.push({
						id: templateId,
						name,
						templateType: channel,
						isGlobal: true,
						storeId: null,
						localizations,
					});
				}
			}
		}
	}
	return records;
}

function toBigIntEpoch(value: unknown): bigint | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "bigint") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return BigInt(Math.trunc(value));
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return BigInt(value.trim());
		} catch {
			return null;
		}
	}
	return null;
}

/** Raw backup rows may use Prisma relation name `MessageTemplateLocalized` instead of `localizations`. */
function normalizeLocalizationInput(
	raw: Record<string, unknown>,
): TemplateLocalizationInput {
	const lastTranslatedAt = toBigIntEpoch(raw.lastTranslatedAt);
	return {
		id: typeof raw.id === "string" ? raw.id : undefined,
		messageTemplateId:
			typeof raw.messageTemplateId === "string" ? raw.messageTemplateId : "",
		localeId: typeof raw.localeId === "string" ? raw.localeId : "",
		bCCEmailAddresses:
			raw.bCCEmailAddresses === null ||
			typeof raw.bCCEmailAddresses === "string"
				? (raw.bCCEmailAddresses as string | null)
				: null,
		subject: typeof raw.subject === "string" ? raw.subject : "",
		body: typeof raw.body === "string" ? raw.body : "",
		isActive: Boolean(raw.isActive),
		translationStatus:
			typeof raw.translationStatus === "string"
				? raw.translationStatus
				: "draft",
		sourceLocaleId:
			raw.sourceLocaleId === null || typeof raw.sourceLocaleId === "string"
				? (raw.sourceLocaleId as string | null)
				: null,
		lastTranslatedAt,
	};
}

function normalizeTemplateInput(raw: Record<string, unknown>): TemplateInput {
	const rawLocs = (raw.localizations ?? raw.MessageTemplateLocalized) as
		| unknown[]
		| undefined;
	const localizations: TemplateLocalizationInput[] = Array.isArray(rawLocs)
		? rawLocs.map((loc) =>
				normalizeLocalizationInput(loc as Record<string, unknown>),
			)
		: [];

	return {
		id: typeof raw.id === "string" ? raw.id : undefined,
		name: typeof raw.name === "string" ? raw.name : "",
		templateType:
			typeof raw.templateType === "string" ? raw.templateType : "email",
		isGlobal: Boolean(raw.isGlobal),
		storeId:
			raw.storeId === null || typeof raw.storeId === "string"
				? (raw.storeId as string | null)
				: null,
		localizations,
	};
}

function parseTemplates(parsed: unknown): TemplateInput[] {
	if (Array.isArray(parsed)) {
		return parsed.map((item) =>
			normalizeTemplateInput(item as Record<string, unknown>),
		);
	}
	if (parsed && typeof parsed === "object") {
		const o = parsed as Record<string, unknown>;
		if (o.lifecycleSeedV2 && typeof o.lifecycleSeedV2 === "object") {
			return expandLifecycleSeedV2(
				o.lifecycleSeedV2 as Record<string, unknown>,
			);
		}
		if (Array.isArray(o.templates)) {
			return (o.templates as Record<string, unknown>[]).map((item) =>
				normalizeTemplateInput(item),
			);
		}
	}
	throw new Error(
		"Backup file must include lifecycleSeedV2 object, templates array, or a root-level templates array",
	);
}

export async function importMessageTemplateBackup(fileName: string): Promise<{
	templates: number;
	localizations: number;
}> {
	const backupDir = path.resolve(process.cwd(), "public", "backup");
	const filePath = path.resolve(backupDir, fileName);
	let fileContent = await fs.readFile(filePath, "utf8");
	if (fileContent.charCodeAt(0) === 0xfeff) {
		fileContent = fileContent.slice(1);
	}
	const parsed = JSON.parse(fileContent) as unknown;
	const templates = parseTemplates(parsed);
	const localeRows = await sqlClient.locale.findMany({
		select: { id: true, lng: true },
	});

	let localizationCount = 0;
	for (const template of templates) {
		const templateId = template.id ?? deterministicId(`tpl:${template.name}`);
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

		for (const localization of template.localizations) {
			if (template.templateType.toLowerCase() === "sms") {
				const smsError = formatSmsBodyLengthError(localization.body);
				if (smsError) {
					throw new Error(
						`${template.name} (${localization.localeId}): ${smsError}`,
					);
				}
			}

			const locale =
				localeRows.find((row) => row.id === localization.localeId) ??
				localeRows.find((row) => row.lng === localization.localeId);
			if (!locale) {
				continue;
			}
			const localizationId =
				localization.id ??
				deterministicId(`loc:${template.name}:${localization.localeId}`);
			await sqlClient.messageTemplateLocalized.upsert({
				where: { id: localizationId },
				update: {
					bCCEmailAddresses: localization.bCCEmailAddresses,
					subject: localization.subject,
					body: localization.body,
					isActive: localization.isActive,
					translationStatus: localization.translationStatus,
					sourceLocaleId: localization.sourceLocaleId,
					lastTranslatedAt: localization.lastTranslatedAt ?? getUtcNowEpoch(),
					localeId: locale.id,
				},
				create: {
					id: localizationId,
					messageTemplateId: templateId,
					localeId: locale.id,
					bCCEmailAddresses: localization.bCCEmailAddresses,
					subject: localization.subject,
					body: localization.body,
					isActive: localization.isActive,
					translationStatus: localization.translationStatus,
					sourceLocaleId: localization.sourceLocaleId,
					lastTranslatedAt: localization.lastTranslatedAt ?? getUtcNowEpoch(),
				},
			});
			localizationCount += 1;
		}
	}

	return {
		templates: templates.length,
		localizations: localizationCount,
	};
}
