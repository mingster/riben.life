import type { Locale } from "@prisma/client";

export interface LocaleColumn {
	id: string;
	name: string;
	lng: string;
	defaultCurrencyId: string;
}

export const mapLocaleToColumn = (locale: Locale): LocaleColumn => ({
	id: locale.id,
	name: locale.name,
	lng: locale.lng,
	defaultCurrencyId: locale.defaultCurrencyId,
});
