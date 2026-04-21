/**
 * Map app i18n language codes to BCP 47 locales for Intl formatting.
 */
export function intlLocaleFromAppLang(lng: string): string {
	switch (lng) {
		case "tw":
			return "zh-Hant";
		case "jp":
			return "ja-JP";
		default:
			return "en-US";
	}
}

/**
 * Format a numeric amount with Intl currency (ISO 4217 code, e.g. `twd`, `USD`).
 */
export function formatCurrencyAmount(
	value: number,
	currencyCode: string,
	locale: string,
): string {
	const code = (currencyCode || "TWD").trim().toUpperCase();
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return `${code} 0`;
	}
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: code,
			maximumFractionDigits: 2,
			minimumFractionDigits: 0,
		}).format(n);
	} catch {
		return `${code} ${n.toFixed(0)}`;
	}
}
