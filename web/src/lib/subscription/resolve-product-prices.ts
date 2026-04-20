import type Stripe from "stripe";
import {
	resolveStripePriceBillingUnit,
	stripeUnitToInternalMinor,
} from "@/lib/payment/stripe/stripe-money";
import { StoreLevel } from "@/types/enum";

/**
 * Default **annual total in app internal minor** (major×100) for Pro when no yearly Stripe Price exists.
 * Example: 12 × NT$300/mo × 100 = 360000; same integer encodes 12 × $300/mo in USD/TWD-style internal.
 * Not a Stripe `unit_amount` until converted: `internalMinorToStripeUnit(currency, …)` maps TWD/USD 1:1 to Stripe subunits; JPY/KRW divide by 100 (see `STRIPE_ZERO_DECIMAL_CURRENCIES` in `stripe-money.ts`).
 */
export const DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT = 360000;

/**
 * Default **annual total in internal minor** for Multi (12× effective 600/mo in the same scheme).
 */
export const DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT = 720000;

/** Stripe Price metadata: `metadata.store_tier` = pro | multi */
export type StoreTierKey = "pro" | "multi";

export interface TierIntervalPrices {
	month?: Stripe.Price;
	year?: Stripe.Price;
}

export interface GroupedSubscriptionPrices {
	pro: TierIntervalPrices;
	multi: TierIntervalPrices;
	/** When metadata is missing, legacy single price used as Pro monthly */
	legacyProMonthly?: Stripe.Price;
}

function normalizeProductId(product: Stripe.Price["product"]): string | null {
	if (typeof product === "string") return product;
	if (product && typeof product === "object" && "id" in product) {
		return (product as Stripe.Product).id;
	}
	return null;
}

export function tierFromMetadata(price: Stripe.Price): StoreTierKey | null {
	const raw = price.metadata?.store_tier ?? price.metadata?.storeTier;
	if (!raw || typeof raw !== "string") return null;
	const v = raw.trim().toLowerCase();
	if (v === "pro") return "pro";
	if (v === "multi") return "multi";
	return null;
}

function intervalKey(price: Stripe.Price): "month" | "year" | null {
	const interval = price.recurring?.interval;
	if (interval === "month") return "month";
	if (interval === "year") return "year";
	return null;
}

/**
 * Groups recurring Stripe Prices for store subscriptions by tier (metadata.store_tier) and interval.
 * Optionally assigns legacy `stripePriceId` as Pro monthly when no metadata matches.
 */
export function groupSubscriptionPrices(
	prices: Stripe.Price[],
	options: {
		productId: string;
		legacyStripePriceId?: string | null;
	},
): GroupedSubscriptionPrices {
	const out: GroupedSubscriptionPrices = {
		pro: {},
		multi: {},
	};

	const productId = options.productId;

	for (const price of prices) {
		if (!price.active) continue;
		if (price.type !== "recurring") continue;
		const pid = normalizeProductId(price.product);
		if (pid !== productId) continue;

		const tier = tierFromMetadata(price);
		const iv = intervalKey(price);
		if (!tier || !iv) continue;

		out[tier][iv] = price;
	}

	const legacyId = options.legacyStripePriceId?.trim();
	if (legacyId) {
		const legacy = prices.find((p) => p.id === legacyId && p.active);
		if (
			legacy &&
			normalizeProductId(legacy.product) === productId &&
			legacy.type === "recurring" &&
			intervalKey(legacy) === "month" &&
			!out.pro.month
		) {
			out.pro.month = legacy;
			out.legacyProMonthly = legacy;
		}
	}

	return out;
}

/**
 * Maps Stripe tier metadata to {@link StoreLevel} for subscription checkout.
 */
export function storeLevelFromTierKey(tier: StoreTierKey): number {
	return tier === "multi" ? StoreLevel.Multi : StoreLevel.Pro;
}

export function tierKeyFromStoreLevel(level: number): StoreTierKey | null {
	if (level === StoreLevel.Pro) return "pro";
	if (level === StoreLevel.Multi) return "multi";
	return null;
}

/**
 * Resolves Pro/Multi from Price metadata; legacy price id without metadata counts as Pro.
 */
export function resolveTierForSubscriptionPrice(
	price: Stripe.Price,
	legacyStripePriceId?: string | null,
): { tier: StoreTierKey; storeLevel: number } {
	const t = tierFromMetadata(price);
	if (t) {
		return { tier: t, storeLevel: storeLevelFromTierKey(t) };
	}
	const legacy = legacyStripePriceId?.trim();
	if (legacy && price.id === legacy) {
		return { tier: "pro", storeLevel: StoreLevel.Pro };
	}
	throw new Error(
		"Invalid subscription price: set metadata.store_tier to pro or multi on this Stripe Price",
	);
}

/**
 * JSON-safe price slot for subscribe UI.
 * `unitAmount` is **internal minor** (major × 100), from Stripe via `stripeUnitToInternalMinor`
 * (TWD/USD align with Stripe subunits; JPY/KRW use Stripe whole majors — see `stripe-money.ts`).
 * Same encoding as {@link prepareStoreSubscription} / checkout — use {@link formatInternalMinorForDisplay} only.
 */
export type SerializedSubscriptionPriceSlot = {
	id: string;
	unitAmount: number | null;
	currency: string;
	interval: "month" | "year";
};

export type SerializedGroupedSubscriptionPrices = {
	pro: {
		month?: SerializedSubscriptionPriceSlot;
		year?: SerializedSubscriptionPriceSlot;
	};
	multi: {
		month?: SerializedSubscriptionPriceSlot;
		year?: SerializedSubscriptionPriceSlot;
	};
};

function serializePriceSlot(
	price: Stripe.Price | undefined,
	presentmentCurrency?: string | null,
): SerializedSubscriptionPriceSlot | undefined {
	if (!price) return undefined;
	const interval = price.recurring?.interval;
	if (interval !== "month" && interval !== "year") return undefined;
	const preferred =
		typeof presentmentCurrency === "string" && presentmentCurrency.trim() !== ""
			? presentmentCurrency
			: price.currency;
	const { currency, unitAmount: stripeUnit } = resolveStripePriceBillingUnit(
		price,
		preferred,
	);
	const unitAmount =
		stripeUnit != null && stripeUnit > 0
			? stripeUnitToInternalMinor(currency, stripeUnit)
			: null;
	return {
		id: price.id,
		unitAmount,
		currency,
		interval,
	};
}

export function serializeGroupedSubscriptionPrices(
	grouped: GroupedSubscriptionPrices,
	options?: { presentmentCurrency?: string | null },
): SerializedGroupedSubscriptionPrices {
	const pc = options?.presentmentCurrency;
	return {
		pro: {
			month: serializePriceSlot(grouped.pro.month, pc),
			year: serializePriceSlot(grouped.pro.year, pc),
		},
		multi: {
			month: serializePriceSlot(grouped.multi.month, pc),
			year: serializePriceSlot(grouped.multi.year, pc),
		},
	};
}

/**
 * Approximate savings of yearly vs 12× monthly (same tier), for UI copy.
 * Returns null if comparison is not possible.
 */
export function approxYearlySavingsPercent(
	monthly: SerializedSubscriptionPriceSlot | undefined,
	yearly: SerializedSubscriptionPriceSlot | undefined,
): number | null {
	if (
		!monthly?.unitAmount ||
		!yearly?.unitAmount ||
		monthly.unitAmount <= 0 ||
		yearly.unitAmount <= 0
	) {
		return null;
	}
	const twelveMonths = monthly.unitAmount * 12;
	if (twelveMonths <= 0) return null;
	return Math.round((1 - yearly.unitAmount / twelveMonths) * 100);
}
