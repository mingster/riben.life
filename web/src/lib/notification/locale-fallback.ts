import type { Locale } from "@/types";

function normalizeLocaleCode(locale: string | null | undefined): string | null {
	if (!locale) return null;
	const value = locale.trim().toLowerCase();
	if (value === "tw" || value === "zh-tw") return "zh-TW";
	if (value === "jp" || value === "ja-jp") return "ja-JP";
	if (value === "en" || value === "en-us") return "en-US";
	return locale;
}

function toLanguageCode(locale: string | null | undefined): string | null {
	const normalized = normalizeLocaleCode(locale);
	if (!normalized) return null;
	const lang = normalized.split("-")[0]?.toLowerCase();
	return lang || null;
}

export function buildLocaleFallbackCandidates(input: {
	requestedLocale: string | null | undefined;
	storeDefaultLocale: string | null | undefined;
	systemDefaultLocale: string | null | undefined;
	availableLocales: Pick<Locale, "id" | "lng">[];
}): string[] {
	const candidates: string[] = [];
	const add = (locale: string | null | undefined) => {
		const normalized = normalizeLocaleCode(locale);
		if (!normalized) return;
		if (!candidates.includes(normalized)) candidates.push(normalized);
	};

	const addLanguagePreferredLocale = (locale: string | null | undefined) => {
		const language = toLanguageCode(locale);
		if (!language) return;
		const sameLanguage = input.availableLocales
			.filter((item) => item.lng.toLowerCase() === language)
			.map((item) => normalizeLocaleCode(item.id))
			.filter((item): item is string => Boolean(item));
		for (const localeId of sameLanguage) add(localeId);
	};

	add(input.requestedLocale);
	addLanguagePreferredLocale(input.requestedLocale);

	add(input.storeDefaultLocale);
	addLanguagePreferredLocale(input.storeDefaultLocale);

	add(input.systemDefaultLocale || "en-US");

	return candidates;
}
