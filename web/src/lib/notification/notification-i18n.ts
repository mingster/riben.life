/**
 * Server-side i18n for RSVP notification subjects and messages.
 * Loads translation.json by locale and interpolates {{var}} placeholders.
 */

import enTranslations from "@/app/i18n/locales/en/translation.json";
import jpTranslations from "@/app/i18n/locales/jp/translation.json";
import twTranslations from "@/app/i18n/locales/tw/translation.json";

type Translations = Record<string, string>;

const translations: Record<string, Translations> = {
	en: enTranslations as Translations,
	tw: twTranslations as Translations,
	jp: jpTranslations as Translations,
};

export type NotificationT = (
	key: string,
	params?: Record<string, string | number>,
) => string;

/**
 * Returns a translation function for the given locale.
 * Falls back to "en" if locale is unknown. Interpolates {{var}} with params.
 */
export function getNotificationT(locale: string): NotificationT {
	const dict = translations[locale] || translations.en;
	const enDict = translations.en;

	return function t(
		key: string,
		params?: Record<string, string | number>,
	): string {
		let s: string | undefined = dict[key];
		if (s == null) s = enDict[key];
		if (s == null) return key;

		if (params) {
			s = s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ""));
		}
		return s;
	};
}
