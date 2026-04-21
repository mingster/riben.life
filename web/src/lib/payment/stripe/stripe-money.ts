/**
 * Stripe `unit_amount` vs app **internal minor** (major display × 100).
 *
 * - **Stripe API**: For USD (and most currencies), `unit_amount` is in **cents** (1/100 major).
 *   For **zero-decimal** currencies in `STRIPE_ZERO_DECIMAL_CURRENCIES` (e.g. `jpy`, `krw`),
 *   `unit_amount` is **whole major units** — `330` means ¥330, not ¥3.30.
 * - **TWD**: Despite older Stripe docs calling TWD “zero-decimal”, the Dashboard and API use
 *   **two-decimal subunits** for Prices/PaymentIntents — `33000` = NT$330 (same integer scale as
 *   internal minor). TWD is **not** in `STRIPE_ZERO_DECIMAL_CURRENCIES`.
 * - **Internal minor**: Used in app state, DB amounts, and serialized subscription price slots
 *   (`SerializedSubscriptionPriceSlot.unitAmount` from `resolve-product-prices`). NT$330 → `33000`.
 * - **Subscribe / billing UI**: Always format with `formatInternalMinorForDisplay` when the value
 *   is internal minor. Use `formatStripeUnitAmountForDisplay` only for **raw** Stripe `unit_amount`.
 * - **`web/bin/install.ts`**: `INSTALL_SUBSCRIPTION_*` env values for Stripe Prices must be **Stripe
 *   units**. Yearly defaults in `resolve-product-prices` (`DEFAULT_SUBSCRIPTION_*_YEARLY_*`) are
 *   **internal minor** — convert with `internalMinorToStripeUnit` before `stripe.prices.create`.
 *
 * Canonical narrative: `web/doc/STRIPE_STORE_SUBSCRIPTION_METADATA.md`.
 */
/**
 * Currencies where Stripe `unit_amount` is **whole major units** (not ×100 per major).
 * **Excludes TWD** — use cent-style integers (33000 = NT$330) to match Stripe behavior.
 */
export const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
	"bif",
	"clp",
	"djf",
	"gnf",
	"jpy",
	"kmf",
	"krw",
	"mga",
	"pyg",
	"rwf",
	"ugx",
	"vnd",
	"vuv",
	"xaf",
	"xof",
	"xpf",
]);

/** Lowercase ISO 4217 code for comparisons (trim, NFKC). */
export function normalizeStripeCurrency(currency: string): string {
	return String(currency ?? "")
		.normalize("NFKC")
		.replace(/\uFEFF/g, "")
		.trim()
		.toLowerCase();
}

/** Fields needed to pick amounts from multi-currency Stripe Prices. */
export type StripePriceBillingFields = {
	currency?: string | null;
	unit_amount?: number | null;
	currency_options?: Record<
		string,
		{ unit_amount?: number | null; unit_amount_decimal?: string | null }
	> | null;
};

function pickCurrencyOptionRow(
	opts: NonNullable<StripePriceBillingFields["currency_options"]>,
	preferred: string,
):
	| { unit_amount?: number | null; unit_amount_decimal?: string | null }
	| undefined {
	const p = normalizeStripeCurrency(preferred);
	if (!p) return undefined;
	for (const [key, val] of Object.entries(opts)) {
		if (normalizeStripeCurrency(key) !== p) continue;
		if (val && typeof val === "object") {
			return val;
		}
	}
	return undefined;
}

/**
 * For manual multi-currency Prices, Stripe keeps a default `currency` + `unit_amount` and
 * alternate rows in `currency_options`. If the store’s presentment currency differs from that
 * default, we must use the matching `currency_options` row (e.g. TWD **33000** for NT$330), not the
 * default row’s integer under another ISO code (e.g. USD **330** = US$3.30). If `currency_options`
 * exists but the preferred currency is missing, returns `{ currency: preferred, unitAmount: null }`
 * so callers fail fast instead of billing the wrong row.
 */
export function resolveStripePriceBillingUnit(
	price: StripePriceBillingFields,
	preferredCurrency: string,
): { currency: string; unitAmount: number | null } {
	const pref = normalizeStripeCurrency(preferredCurrency);
	const opts = price.currency_options;
	const base = normalizeStripeCurrency(String(price.currency ?? ""));
	if (opts && pref && typeof opts === "object") {
		const row = pickCurrencyOptionRow(opts, pref);
		if (row) {
			if (typeof row.unit_amount === "number" && row.unit_amount > 0) {
				return { currency: pref, unitAmount: row.unit_amount };
			}
			const dec = row.unit_amount_decimal;
			if (dec != null && String(dec).length > 0) {
				const d = Number(String(dec));
				if (!Number.isNaN(d) && d > 0) {
					return { currency: pref, unitAmount: Math.round(d) };
				}
			}
		}
		// Multi-currency Price: do not fall back to the default row when the store's currency
		// has no `currency_options` entry — wrong currency + wrong scale (e.g. USD 330 vs TWD 33000).
		if (pref !== base) {
			return { currency: pref, unitAmount: null };
		}
	}
	return { currency: base, unitAmount: price.unit_amount ?? null };
}

export function isZeroDecimalCurrency(currency: string): boolean {
	return STRIPE_ZERO_DECIMAL_CURRENCIES.has(normalizeStripeCurrency(currency));
}

/**
 * Currencies we show without fraction digits in UI (NT$330, ¥1000) even when Stripe uses subunits for TWD.
 */
export function currencyDisplayUsesIntegerMajors(currency: string): boolean {
	const c = normalizeStripeCurrency(currency);
	return isZeroDecimalCurrency(c) || c === "twd";
}

/**
 * Minimum Stripe `unit_amount` for subscription sanity checks (wrong tier / typo detection).
 * TWD uses subunits like USD; 330 would be NT$3.30 — reject below NT$30.
 */
export function minStripeUnitsForSubscriptionSanityCheck(
	currency: string,
): number {
	const c = normalizeStripeCurrency(currency);
	if (isZeroDecimalCurrency(c)) {
		return 15;
	}
	if (c === "twd") {
		return 3000;
	}
	return 50;
}

/**
 * Internal money: integer = major display units × 100 (NT$330 → 33000; USD $3.30 → 330).
 * Used everywhere in app state, DB subscription rows, and PaymentIntent API `total`.
 */
export function majorUnitsToInternalMinor(major: number): number {
	const m = typeof major === "number" ? major : Number(major);
	if (!Number.isFinite(m)) {
		return 0;
	}
	return Math.round(m * 100);
}

export function internalMinorToMajor(internalMinor: number): number {
	const u = Math.round(internalMinor);
	if (!Number.isFinite(u)) {
		return 0;
	}
	return u / 100;
}

/**
 * Stripe Price / PaymentIntent `unit_amount` → internal minor (major×100).
 */
export function stripeUnitToInternalMinor(
	currency: string,
	stripeUnit: number | null,
): number {
	if (stripeUnit == null) {
		return 0;
	}
	const n = Math.round(
		typeof stripeUnit === "number" ? stripeUnit : Number(stripeUnit),
	);
	if (!Number.isFinite(n)) {
		return 0;
	}
	const c = normalizeStripeCurrency(currency);
	if (isZeroDecimalCurrency(c)) {
		return n * 100;
	}
	return n;
}

/**
 * Internal minor → Stripe smallest charge unit (cents for USD/TWD; whole majors for JPY, etc.).
 */
export function internalMinorToStripeUnit(
	currency: string,
	internalMinor: number,
): number {
	const c = normalizeStripeCurrency(currency);
	const u = Math.round(internalMinor);
	if (!Number.isFinite(u) || u <= 0) {
		return 0;
	}
	if (isZeroDecimalCurrency(c)) {
		return Math.round(u / 100);
	}
	return u;
}

/**
 * Major display units (cart, order totals) → Stripe smallest unit.
 * Prefer this when reading `order.orderTotal` or line-item majors from checkout.
 */
export function majorUnitsToStripeUnit(
	currency: string,
	majorUnits: number,
): number {
	return internalMinorToStripeUnit(
		currency,
		majorUnitsToInternalMinor(majorUnits),
	);
}

/**
 * UI: {@link currencyDisplayUsesIntegerMajors} (TWD, JPY, …) shows whole majors without “.00”;
 * other currencies use two fraction digits ($330.00).
 */
export function formatInternalMinorForDisplay(
	currency: string,
	internalMinor: number,
	locale = "en-US",
): string {
	const c = normalizeStripeCurrency(currency);
	const major = internalMinorToMajor(internalMinor);
	const cur = c.toUpperCase();
	if (currencyDisplayUsesIntegerMajors(c)) {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: cur,
			maximumFractionDigits: 0,
			minimumFractionDigits: 0,
		}).format(major);
	}
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: cur,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(major);
}

/**
 * Format a Stripe Price `unit_amount` / billing unit (Stripe’s smallest chargeable unit:
 * USD/TWD = 1/100 major, JPY = whole majors) as a localized currency string in **major** units
 * ($9.99, NT$330, etc.).
 */
export function formatStripeUnitAmountForDisplay(
	currency: string,
	stripeUnitAmount: number | null | undefined,
	locale = "en-US",
): string {
	if (
		stripeUnitAmount == null ||
		!Number.isFinite(stripeUnitAmount) ||
		Math.round(stripeUnitAmount) <= 0
	) {
		return "—";
	}
	const internal = stripeUnitToInternalMinor(
		currency,
		Math.round(stripeUnitAmount),
	);
	return formatInternalMinorForDisplay(currency, internal, locale);
}

/**
 * `SubscriptionPayment.amount` used to store major units; new rows store internal minor.
 * Matches either representation against `expectedInternalMinor` from the current Stripe Price.
 */
export function internalMinorMatchesLegacySubscriptionPaymentStored(
	storedAmount: number,
	expectedInternalMinor: number,
): boolean {
	const e = Math.round(expectedInternalMinor);
	const s = Number(storedAmount);
	if (!Number.isFinite(e) || !Number.isFinite(s)) {
		return false;
	}
	if (Math.round(s) === e) {
		return true;
	}
	return majorUnitsToInternalMinor(s) === e;
}
