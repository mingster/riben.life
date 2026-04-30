import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { buildMissingLocalizationPlan } from "./template-localization-plan";

export interface LocalizationCoverageSummary {
	requiredLocales: string[];
	templateCount: number;
	totalExpectedLocalizedRows: number;
	totalExistingLocalizedRows: number;
	totalMissingLocalizedRows: number;
	missingByLocale: Record<string, number>;
}

export interface BackfillResult {
	templatesProcessed: number;
	localizedRowsCreated: number;
	missingWithoutFallbackSource: number;
	coverage: LocalizationCoverageSummary;
}

const FALLBACK_LOCALE_ID = "en-US";

async function getRequiredLocaleIds(): Promise<string[]> {
	const locales = await sqlClient.locale.findMany({
		select: { id: true },
		orderBy: { id: "asc" },
	});
	return locales.map((item) => item.id);
}

async function getCoverageSummary(): Promise<LocalizationCoverageSummary> {
	const [requiredLocales, templates, localizations] = await Promise.all([
		getRequiredLocaleIds(),
		sqlClient.messageTemplate.findMany({
			select: { id: true },
		}),
		sqlClient.messageTemplateLocalized.findMany({
			select: { messageTemplateId: true, localeId: true },
		}),
	]);

	const missingByLocale: Record<string, number> = {};
	for (const localeId of requiredLocales) {
		missingByLocale[localeId] = 0;
	}

	const existingSet = new Set(
		localizations.map((item) => `${item.messageTemplateId}__${item.localeId}`),
	);
	for (const template of templates) {
		for (const localeId of requiredLocales) {
			if (!existingSet.has(`${template.id}__${localeId}`)) {
				missingByLocale[localeId] = (missingByLocale[localeId] || 0) + 1;
			}
		}
	}

	const totalMissingLocalizedRows = Object.values(missingByLocale).reduce(
		(acc, count) => acc + count,
		0,
	);

	return {
		requiredLocales,
		templateCount: templates.length,
		totalExpectedLocalizedRows: templates.length * requiredLocales.length,
		totalExistingLocalizedRows: localizations.length,
		totalMissingLocalizedRows,
		missingByLocale,
	};
}

export async function getTemplateLocalizationCoverageReport(): Promise<LocalizationCoverageSummary> {
	return getCoverageSummary();
}

export async function backfillMissingTemplateLocalizations(): Promise<BackfillResult> {
	const requiredLocales = await getRequiredLocaleIds();
	const templates = await sqlClient.messageTemplate.findMany({
		include: {
			MessageTemplateLocalized: true,
		},
	});

	let localizedRowsCreated = 0;
	let missingWithoutFallbackSource = 0;
	const now = getUtcNowEpoch();

	const plan = buildMissingLocalizationPlan({
		requiredLocales,
		templates: templates.map((template) => ({
			id: template.id,
			localizations: template.MessageTemplateLocalized.map((item) => ({
				localeId: item.localeId,
			})),
		})),
		fallbackLocaleId: FALLBACK_LOCALE_ID,
	});

	for (const item of plan) {
		const template = templates.find(
			(current) => current.id === item.templateId,
		);
		if (!template) continue;
		const fallbackSource =
			template.MessageTemplateLocalized.find(
				(localized) => localized.localeId === item.sourceLocaleId,
			) ?? null;
		if (!fallbackSource) {
			missingWithoutFallbackSource += 1;
			continue;
		}
		try {
			await sqlClient.messageTemplateLocalized.create({
				data: {
					messageTemplateId: item.templateId,
					localeId: item.localeId,
					bCCEmailAddresses: fallbackSource.bCCEmailAddresses,
					subject: fallbackSource.subject,
					body: fallbackSource.body,
					isActive: fallbackSource.isActive,
					translationStatus: "draft",
					sourceLocaleId: item.sourceLocaleId,
					lastTranslatedAt: now,
				},
			});
			localizedRowsCreated += 1;
		} catch {
			// idempotent behavior if concurrent jobs create the same row
		}
	}

	const coverage = await getCoverageSummary();
	return {
		templatesProcessed: templates.length,
		localizedRowsCreated,
		missingWithoutFallbackSource,
		coverage,
	};
}
