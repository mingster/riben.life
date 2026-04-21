/**
 * PayPal expects major-unit decimal strings. Zero-decimal currencies use no fraction digits.
 * @see https://developer.paypal.com/docs/api/reference/currency-codes/
 */
const ZERO_DECIMAL = new Set([
	"BIF",
	"CLP",
	"DJF",
	"GNF",
	"JPY",
	"KMF",
	"KRW",
	"MGA",
	"PYG",
	"RWF",
	"UGX",
	"VND",
	"VUV",
	"XAF",
	"XOF",
	"XPF",
]);

/**
 * Format a major-unit number for PayPal `purchase_units[].amount.value`.
 */
export function formatPayPalAmountValue(
	totalMajorUnits: number,
	currencyUpper: string,
): string {
	const c = currencyUpper.toUpperCase();
	if (ZERO_DECIMAL.has(c)) {
		return String(Math.round(totalMajorUnits));
	}
	return totalMajorUnits.toFixed(2);
}
