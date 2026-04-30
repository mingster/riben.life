export interface MissingLocalizationPlanItem {
	templateId: string;
	localeId: string;
	sourceLocaleId: string | null;
}

export function buildMissingLocalizationPlan(input: {
	requiredLocales: string[];
	templates: Array<{
		id: string;
		localizations: Array<{ localeId: string }>;
	}>;
	fallbackLocaleId?: string;
}): MissingLocalizationPlanItem[] {
	const fallbackLocaleId = input.fallbackLocaleId ?? "en-US";
	const plan: MissingLocalizationPlanItem[] = [];
	for (const template of input.templates) {
		const existing = new Set(
			template.localizations.map((item) => item.localeId),
		);
		const sourceLocaleId = existing.has(fallbackLocaleId)
			? fallbackLocaleId
			: (template.localizations[0]?.localeId ?? null);
		for (const localeId of input.requiredLocales) {
			if (!existing.has(localeId)) {
				plan.push({
					templateId: template.id,
					localeId,
					sourceLocaleId,
				});
			}
		}
	}
	return plan;
}
