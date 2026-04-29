#!/usr/bin/env bun
/**
 * Installation Script
 *
 * This script initializes the database with default data:
 * - Countries (ISO 3166)
 * - Currencies (ISO 4217)
 * - Locales
 * - Payment methods (from public/install/payment_methods.json — skip if same name or same payUrl as an existing row)
 * - Shipping methods (from public/install/shipping_methods.json — only names not already in DB)
 * - Platform settings (+ optional Stripe product/price for store subscriptions)
 *
 * Usage:
 *   bun run bin/install.ts              # Run full installation
 *   bun run bin/install.ts --wipeout    # Wipeout and reinstall
 *   bun run bin/install.ts --check      # Check installation status
 *   bun run bin/install.ts --skip-stripe  # Skip Stripe product/price setup (no STRIPE_SECRET_KEY)
 *
 * Subscription price (when creating in Stripe):
 *   Defaults: USD = cents; JPY/KRW etc. = Stripe zero-decimal majors; TWD = subunits like USD (33000 = NT$330).
 *   Pro monthly default: twd → unit_amount 33000 (NT$330); usd → 30000 ($300.00).
 *   Yearly defaults: derived from app internal-minor totals in resolve-product-prices (converted to Stripe units per currency).
 *   INSTALL_SUBSCRIPTION_CURRENCY       # default twd
 *   INSTALL_SUBSCRIPTION_UNIT_AMOUNT    # Pro monthly — Stripe unit_amount, whole integer only (twd: 33000 = NT$330; not 3.3 — decimals rejected). usd: 30000 = $300
 *   INSTALL_SUBSCRIPTION_PRODUCT_NAME   # default "riben.life store subscription"
 * Optional (defaults shown):
 *   INSTALL_SUBSCRIPTION_MULTI_UNIT_AMOUNT           # Multi-store monthly Stripe unit; default = 2 × Pro monthly Stripe unit
 *   INSTALL_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT      # Pro yearly Stripe unit_amount override (else derived from internal default)
 *   INSTALL_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT    # Multi yearly Stripe unit_amount override
 * Or pin an existing Stripe price:
 *   INSTALL_STRIPE_PRICE_ID             # e.g. price_xxx — must exist in the connected Stripe account
 */

import { promises as fs } from "node:fs";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { stripe } from "@/lib/payment/stripe/config";
import {
	internalMinorToStripeUnit,
	isZeroDecimalCurrency,
	majorUnitsToStripeUnit,
	normalizeStripeCurrency,
} from "@/lib/payment/stripe/stripe-money";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import {
	DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT,
	DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT,
	groupSubscriptionPrices,
	tierFromMetadata,
} from "@/lib/subscription/resolve-product-prices";

/** Platform store subscription default currency (lowercase ISO). */
const DEFAULT_PLATFORM_SUBSCRIPTION_CURRENCY = "twd";

/** Pro monthly default in **major display units** (e.g. 330 → NT$330) before `majorUnitsToStripeUnit`. */
const DEFAULT_PRO_MONTHLY_MAJOR_TWD = 330;

/**
 * Default Pro **monthly** Stripe `unit_amount` when `INSTALL_SUBSCRIPTION_UNIT_AMOUNT` is unset.
 * Uses {@link majorUnitsToStripeUnit} so TWD (subunits), USD (cents), and zero-decimal majors differ correctly.
 */
function defaultProMonthlyStripeUnitForCurrency(currency: string): number {
	const c = normalizeStripeCurrency(currency);
	if (c === "usd") {
		return majorUnitsToStripeUnit(c, 300);
	}
	if (c === "twd") {
		return majorUnitsToStripeUnit(c, DEFAULT_PRO_MONTHLY_MAJOR_TWD);
	}
	if (isZeroDecimalCurrency(c)) {
		return majorUnitsToStripeUnit(c, DEFAULT_PRO_MONTHLY_MAJOR_TWD);
	}
	return majorUnitsToStripeUnit(c, 100);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isWipeout = args.includes("--wipeout");
const isCheck = args.includes("--check");
const isSkipStripe = args.includes("--skip-stripe");

/** Stripe Price IDs always start with `price_`. */
function isStripePriceId(value: string): boolean {
	return /^price_[a-zA-Z0-9]+$/.test(value.trim());
}

function canCallStripeApi(): boolean {
	return Boolean(process.env.STRIPE_SECRET_KEY?.trim()) && !isSkipStripe;
}

function stripeProductIdFromPrice(price: Stripe.Price): string {
	const p = price.product;
	return typeof p === "string" ? p : p.id;
}

/** Tier match including legacy Pro monthly price id without `metadata.store_tier`. */
function priceMatchesStoreTier(
	p: Stripe.Price,
	productId: string,
	tier: "pro" | "multi",
	legacyStripePriceId: string | null,
): boolean {
	if (
		!p.active ||
		p.type !== "recurring" ||
		stripeProductIdFromPrice(p) !== productId
	) {
		return false;
	}
	if (tierFromMetadata(p) === tier) {
		return true;
	}
	const legacy = legacyStripePriceId?.trim();
	return (
		tier === "pro" && legacy !== undefined && legacy !== "" && p.id === legacy
	);
}

/**
 * Deactivates active Stripe prices for this tier/interval whose `unit_amount` differs from
 * expected, then creates one correct price if none remain. Stripe prices are immutable.
 */
async function reconcileTierIntervalPrice(params: {
	productId: string;
	currency: string;
	productName: string;
	tier: "pro" | "multi";
	interval: "month" | "year";
	expectedUnitAmount: number;
	nickname: string;
	prices: Stripe.Price[];
	legacyStripePriceId: string | null;
}): Promise<boolean> {
	const {
		productId,
		currency,
		productName,
		tier,
		interval,
		expectedUnitAmount,
		nickname,
		prices,
		legacyStripePriceId,
	} = params;

	const matches = prices
		.filter((p) =>
			priceMatchesStoreTier(p, productId, tier, legacyStripePriceId),
		)
		.filter((p) => p.recurring?.interval === interval);

	const correct = matches.filter((p) => p.unit_amount === expectedUnitAmount);
	const wrong = matches.filter((p) => p.unit_amount !== expectedUnitAmount);

	let mutated = false;
	for (const p of wrong) {
		await stripe.prices.update(p.id, { active: false });
		console.log(
			`  ✓ Deactivated outdated price ${p.id} (${tier} ${interval}, was ${p.unit_amount}, expected ${expectedUnitAmount})`,
		);
		mutated = true;
	}

	if (correct.length > 0) {
		return mutated;
	}

	const created = await stripe.prices.create({
		product: productId,
		currency,
		unit_amount: expectedUnitAmount,
		recurring: { interval },
		metadata: { store_tier: tier },
		nickname,
	});
	console.log(
		`  ✓ Created price ${created.id} (${tier}, ${interval}, unit_amount ${created.unit_amount})`,
	);
	return true;
}

/** Reject common foot-gun amounts (same checks as legacy single-price install). */
function subscriptionUnitAmountPassesGuardrails(
	currency: string,
	unitAmount: number,
	label: string,
): boolean {
	if (currency === "usd" && unitAmount === 300) {
		console.error(
			`  ⚠️  Refusing ${label}: USD unit_amount 300 = US$3.00 (cents). Use 30000 for US$300.`,
		);
		return false;
	}
	if (currency === "twd" && unitAmount === 330) {
		console.error(
			`  ⚠️  Refusing ${label}: TWD Stripe amounts use 1/100 of a dollar (like USD cents). unit_amount 330 = NT$3.30 in the Dashboard. For NT$330/month use 33000.`,
		);
		return false;
	}
	if (currency === "twd" && unitAmount === 3) {
		console.error(
			`  ⚠️  Refusing ${label}: TWD unit_amount 3 = NT$0.03. For NT$330/month use 33000. Note: env value 3.3 is parsed as 3 — use whole integers only.`,
		);
		return false;
	}
	return true;
}

/**
 * Parses a Stripe `unit_amount` from env: whole positive integer only.
 * `Number.parseInt("3.3", 10)` → 3 (NT$3); this rejects decimals instead.
 */
function parsePositiveStripeUnitAmount(
	raw: string | undefined,
	fallbackUnits: number,
	fieldLabel: string,
): number | null {
	const cleaned = String(raw ?? "")
		.replace(/\uFEFF/g, "")
		.trim();
	if (cleaned.length === 0) {
		return fallbackUnits > 0 ? fallbackUnits : null;
	}
	const n = Number(cleaned);
	if (!Number.isFinite(n) || n <= 0) {
		console.error(
			`  ⚠️  ${fieldLabel} must be a positive number, got: ${cleaned}`,
		);
		return null;
	}
	const rounded = Math.round(n);
	if (Math.abs(n - rounded) > 1e-9) {
		console.error(
			`  ⚠️  ${fieldLabel} must be a whole-number Stripe unit_amount (no decimals). Got: ${cleaned}. Example for TWD: 33000 = NT$330/month — not 3.3.`,
		);
		return null;
	}
	return rounded;
}

function parseOptionalEnvStripeUnit(
	raw: string | undefined,
	fieldLabel: string,
): number | undefined {
	const cleaned = String(raw ?? "")
		.replace(/\uFEFF/g, "")
		.trim();
	if (cleaned.length === 0) {
		return undefined;
	}
	const n = Number(cleaned);
	if (!Number.isFinite(n) || n <= 0) {
		console.error(
			`  ⚠️  ${fieldLabel} must be a positive number, got: ${cleaned}`,
		);
		return undefined;
	}
	const rounded = Math.round(n);
	if (Math.abs(n - rounded) > 1e-9) {
		console.error(
			`  ⚠️  ${fieldLabel} must be a whole integer (no decimals), got: ${cleaned}`,
		);
		return undefined;
	}
	return rounded;
}

function resolveMultiMonthlyUnitAmount(proMonthly: number): number {
	const n = parseOptionalEnvStripeUnit(
		process.env.INSTALL_SUBSCRIPTION_MULTI_UNIT_AMOUNT,
		"INSTALL_SUBSCRIPTION_MULTI_UNIT_AMOUNT",
	);
	if (n != null) {
		return n;
	}
	return proMonthly * 2;
}

function resolveProYearlyStripeUnitAmount(currency: string): number {
	const n = parseOptionalEnvStripeUnit(
		process.env.INSTALL_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT,
		"INSTALL_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT",
	);
	if (n != null) {
		return n;
	}
	return internalMinorToStripeUnit(
		currency,
		DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT,
	);
}

function resolveMultiYearlyStripeUnitAmount(currency: string): number {
	const n = parseOptionalEnvStripeUnit(
		process.env.INSTALL_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT,
		"INSTALL_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT",
	);
	if (n != null) {
		return n;
	}
	return internalMinorToStripeUnit(
		currency,
		DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT,
	);
}

/**
 * Ensures Pro/Multi × month/year recurring prices: creates missing ones, and replaces
 * existing active prices whose `unit_amount` does not match (deactivate + create).
 */
async function ensureSubscriptionTierPrices(params: {
	productId: string;
	currency: string;
	productName: string;
	proMonthlyUnitAmount: number;
	multiMonthlyUnitAmount: number;
	proYearlyUnitAmount: number;
	multiYearlyUnitAmount: number;
	legacyStripePriceId: string | null;
}): Promise<void> {
	const {
		productId,
		currency,
		productName,
		proMonthlyUnitAmount,
		multiMonthlyUnitAmount,
		proYearlyUnitAmount,
		multiYearlyUnitAmount,
		legacyStripePriceId,
	} = params;

	const list = await stripe.prices.list({
		product: productId,
		active: true,
		limit: 100,
	});
	const prices = list.data;

	let anyMutation = false;
	const run = async (args: {
		tier: "pro" | "multi";
		interval: "month" | "year";
		expectedUnitAmount: number;
		nickname: string;
	}) => {
		const changed = await reconcileTierIntervalPrice({
			productId,
			currency,
			productName,
			legacyStripePriceId,
			prices,
			...args,
		});
		if (changed) {
			anyMutation = true;
		}
	};

	await run({
		tier: "pro",
		interval: "month",
		expectedUnitAmount: proMonthlyUnitAmount,
		nickname: `Pro monthly — ${productName}`,
	});
	await run({
		tier: "pro",
		interval: "year",
		expectedUnitAmount: proYearlyUnitAmount,
		nickname: `Pro yearly — ${productName}`,
	});
	await run({
		tier: "multi",
		interval: "month",
		expectedUnitAmount: multiMonthlyUnitAmount,
		nickname: `Multi monthly — ${productName}`,
	});
	await run({
		tier: "multi",
		interval: "year",
		expectedUnitAmount: multiYearlyUnitAmount,
		nickname: `Multi yearly — ${productName}`,
	});

	if (!anyMutation) {
		console.log(
			"  ✓ Subscription tier prices already match (pro/multi × month/year)",
		);
	}
}

async function resolveProMonthlyStripePriceId(
	productId: string,
	legacyStripePriceId: string | null,
): Promise<string | null> {
	const list = await stripe.prices.list({
		product: productId,
		active: true,
		limit: 100,
	});
	const grouped = groupSubscriptionPrices(list.data, {
		productId,
		legacyStripePriceId,
	});
	return grouped.pro.month?.id ?? grouped.legacyProMonthly?.id ?? null;
}

/**
 * Ensures PlatformSettings has a Stripe product and Pro/Multi × monthly/yearly prices (metadata.store_tier).
 */
async function ensurePlatformStripeSubscriptionPrice(): Promise<void> {
	if (isSkipStripe) {
		console.log("\n💳 Stripe setup skipped (--skip-stripe)");
		return;
	}

	const secret = process.env.STRIPE_SECRET_KEY?.trim();
	if (!secret) {
		console.log(
			"\n💳 STRIPE_SECRET_KEY not set — skipping Stripe subscription price creation",
		);
		console.log(
			"  💡 Set STRIPE_SECRET_KEY and re-run install, or use sysAdmin → settings to set price IDs",
		);
		return;
	}

	console.log(
		"\n💳 Ensuring platform Stripe subscription product & tier prices...",
	);

	const settings = await sqlClient.platformSettings.findFirst();
	const storedLegacyId =
		settings?.stripePriceId?.trim() && isStripePriceId(settings.stripePriceId)
			? settings.stripePriceId.trim()
			: null;

	const currencyDefault =
		normalizeStripeCurrency(
			process.env.INSTALL_SUBSCRIPTION_CURRENCY?.trim() ||
				DEFAULT_PLATFORM_SUBSCRIPTION_CURRENCY,
		) || DEFAULT_PLATFORM_SUBSCRIPTION_CURRENCY;

	const proMonthlyDefault = parsePositiveStripeUnitAmount(
		process.env.INSTALL_SUBSCRIPTION_UNIT_AMOUNT,
		defaultProMonthlyStripeUnitForCurrency(currencyDefault),
		"INSTALL_SUBSCRIPTION_UNIT_AMOUNT",
	);
	if (proMonthlyDefault === null) {
		return;
	}
	if (
		!subscriptionUnitAmountPassesGuardrails(
			currencyDefault,
			proMonthlyDefault,
			"INSTALL_SUBSCRIPTION_UNIT_AMOUNT",
		)
	) {
		return;
	}

	const productName =
		process.env.INSTALL_SUBSCRIPTION_PRODUCT_NAME?.trim() ||
		"riben.life store subscription";

	const runEnsureForProduct = async (args: {
		productId: string;
		currency: string;
		proMonthlyUnitAmount: number;
		legacyStripePriceId: string | null;
		pinnedOrPrimaryPriceId: string | null;
	}) => {
		const multiMonthly = resolveMultiMonthlyUnitAmount(
			args.proMonthlyUnitAmount,
		);
		const proYearly = resolveProYearlyStripeUnitAmount(args.currency);
		const multiYearly = resolveMultiYearlyStripeUnitAmount(args.currency);

		if (
			!subscriptionUnitAmountPassesGuardrails(
				args.currency,
				multiMonthly,
				"multi monthly (computed or INSTALL_SUBSCRIPTION_MULTI_UNIT_AMOUNT)",
			)
		) {
			return;
		}
		if (
			!subscriptionUnitAmountPassesGuardrails(
				args.currency,
				proYearly,
				"pro yearly (computed or INSTALL_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT)",
			)
		) {
			return;
		}
		if (
			!subscriptionUnitAmountPassesGuardrails(
				args.currency,
				multiYearly,
				"multi yearly (computed or INSTALL_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT)",
			)
		) {
			return;
		}

		await ensureSubscriptionTierPrices({
			productId: args.productId,
			currency: args.currency,
			productName,
			proMonthlyUnitAmount: args.proMonthlyUnitAmount,
			multiMonthlyUnitAmount: multiMonthly,
			proYearlyUnitAmount: proYearly,
			multiYearlyUnitAmount: multiYearly,
			legacyStripePriceId: args.legacyStripePriceId,
		});

		const proMonthId = await resolveProMonthlyStripePriceId(
			args.productId,
			args.legacyStripePriceId,
		);
		const stripePriceId =
			proMonthId ?? args.pinnedOrPrimaryPriceId ?? storedLegacyId;
		if (!stripePriceId) {
			console.error(
				"  ⚠️  Could not resolve Pro monthly price id after ensure — check Stripe product prices",
			);
			return;
		}
		await upsertPlatformStripeIds(args.productId, stripePriceId);
		console.log(`  ✓ Platform stripePriceId (Pro monthly): ${stripePriceId}`);
	};

	const pinnedPriceId = process.env.INSTALL_STRIPE_PRICE_ID?.trim();
	if (pinnedPriceId) {
		if (!isStripePriceId(pinnedPriceId)) {
			console.error(
				`  ⚠️  INSTALL_STRIPE_PRICE_ID must look like price_xxx, got: ${pinnedPriceId}`,
			);
			return;
		}
		try {
			const price = await stripe.prices.retrieve(pinnedPriceId);
			const productId = stripeProductIdFromPrice(price);
			const cur = (price.currency ?? currencyDefault).toLowerCase();
			const proMonthlyFromPrice =
				price.recurring?.interval === "month" && price.unit_amount != null
					? price.unit_amount
					: proMonthlyDefault;

			await runEnsureForProduct({
				productId,
				currency: cur,
				proMonthlyUnitAmount: proMonthlyFromPrice,
				legacyStripePriceId: pinnedPriceId,
				pinnedOrPrimaryPriceId: pinnedPriceId,
			});
			console.log(`  ✓ INSTALL_STRIPE_PRICE_ID pinned: ${pinnedPriceId}`);
			return;
		} catch (err: unknown) {
			console.error(
				"  ⚠️  INSTALL_STRIPE_PRICE_ID not found in Stripe:",
				err instanceof Error ? err.message : err,
			);
			return;
		}
	}

	const currentPriceId = storedLegacyId ?? "";

	let existingPrice: Stripe.Price | null = null;
	if (currentPriceId) {
		try {
			existingPrice = await stripe.prices.retrieve(currentPriceId);
			console.log(
				`  ✓ Existing platform stripePriceId is valid: ${currentPriceId}`,
			);
		} catch {
			console.log(
				`  ⚠️  Stored stripePriceId invalid in Stripe (${currentPriceId}) — will create product/prices`,
			);
			existingPrice = null;
		}
	} else if (settings?.stripePriceId?.trim()) {
		console.log(
			`  ⚠️  Stored stripePriceId is not a real Stripe price id (${settings?.stripePriceId}) — will create`,
		);
	}

	if (existingPrice) {
		const productId = stripeProductIdFromPrice(existingPrice);
		const cur = (existingPrice.currency ?? currencyDefault).toLowerCase();
		const proMonthlyFromPrice =
			existingPrice.recurring?.interval === "month" &&
			existingPrice.unit_amount != null
				? existingPrice.unit_amount
				: proMonthlyDefault;

		await runEnsureForProduct({
			productId,
			currency: cur,
			proMonthlyUnitAmount: proMonthlyFromPrice,
			legacyStripePriceId: currentPriceId || null,
			pinnedOrPrimaryPriceId: currentPriceId || null,
		});
		return;
	}

	const multiMonthly = resolveMultiMonthlyUnitAmount(proMonthlyDefault);
	const proYearly = resolveProYearlyStripeUnitAmount(currencyDefault);
	const multiYearly = resolveMultiYearlyStripeUnitAmount(currencyDefault);
	if (
		!subscriptionUnitAmountPassesGuardrails(
			currencyDefault,
			multiMonthly,
			"multi monthly",
		) ||
		!subscriptionUnitAmountPassesGuardrails(
			currencyDefault,
			proYearly,
			"pro yearly",
		) ||
		!subscriptionUnitAmountPassesGuardrails(
			currencyDefault,
			multiYearly,
			"multi yearly",
		)
	) {
		return;
	}

	try {
		const product = await stripe.products.create({ name: productName });
		console.log(`  ✓ Created Stripe product ${product.id}`);

		await ensureSubscriptionTierPrices({
			productId: product.id,
			currency: currencyDefault,
			productName,
			proMonthlyUnitAmount: proMonthlyDefault,
			multiMonthlyUnitAmount: multiMonthly,
			proYearlyUnitAmount: proYearly,
			multiYearlyUnitAmount: multiYearly,
			legacyStripePriceId: null,
		});

		const proMonthId = await resolveProMonthlyStripePriceId(product.id, null);
		if (!proMonthId) {
			console.error("  ❌ Could not resolve Pro monthly price after create");
			return;
		}
		await upsertPlatformStripeIds(product.id, proMonthId);
		console.log(`  ✓ Platform stripePriceId (Pro monthly): ${proMonthId}`);
	} catch (err: unknown) {
		console.error(
			"  ❌ Failed to create Stripe subscription product/prices:",
			err instanceof Error ? err.message : err,
		);
		throw err;
	}
}

async function upsertPlatformStripeIds(
	stripeProductId: string,
	stripePriceId: string,
): Promise<void> {
	const existing = await sqlClient.platformSettings.findFirst();
	if (!existing) {
		await sqlClient.platformSettings.create({
			data: {
				stripeProductId,
				stripePriceId,
				settings: null,
			},
		});
		return;
	}

	await sqlClient.platformSettings.update({
		where: { id: existing.id },
		data: { stripeProductId, stripePriceId },
	});
}

async function checkInstallationStatus() {
	console.log("📊 Checking installation status...\n");

	try {
		const countryCount = await sqlClient.country.count();
		const currencyCount = await sqlClient.currency.count();
		const localeCount = await sqlClient.locale.count();
		const paymentMethodCount = await sqlClient.paymentMethod.count();
		const shippingMethodCount = await sqlClient.shippingMethod.count();
		const platformSettings = await sqlClient.platformSettings.findFirst();

		console.log(`✓ Countries:        ${countryCount} records`);
		console.log(`✓ Currencies:       ${currencyCount} records`);
		console.log(`✓ Locales:          ${localeCount} records`);
		console.log(`✓ Payment methods:  ${paymentMethodCount} records`);
		console.log(`✓ Shipping methods: ${shippingMethodCount} records`);
		console.log(
			`✓ Platform Settings: ${platformSettings ? "Configured" : "Not configured"}`,
		);

		if (platformSettings) {
			console.log(
				`\n  Stripe Product ID: ${platformSettings.stripeProductId || "Not set"}`,
			);
			console.log(
				`  Stripe Price ID:   ${platformSettings.stripePriceId || "Not set"}`,
			);
		}

		const isInstalled =
			countryCount > 0 && currencyCount > 0 && localeCount > 0;

		if (isInstalled) {
			console.log("\n✅ Installation is complete!");
		} else {
			console.log(
				"\n⚠️  Installation is incomplete. Run: bun run bin/install.ts",
			);
		}

		return isInstalled;
	} catch (error) {
		console.error("❌ Error checking installation:", error);
		return false;
	}
}

async function populateCountryData() {
	console.log("\n📍 Populating country data...");

	const filePath = `${process.cwd()}/public/install/country_iso.json`;
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	let created = 0;
	for (const item of data) {
		try {
			await sqlClient.country.create({
				data: {
					alpha3: item.alpha3,
					name: item.name,
					unCode: item.unCode,
				},
			});
			created++;
		} catch (error) {
			console.error(`  ⚠️  Failed to create country: ${item.name}`, error);
		}
	}

	console.log(`  ✓ Created ${created} countries`);
	return created;
}

async function populateCurrencyData() {
	console.log("\n💰 Populating currency data...");

	const filePath = `${process.cwd()}/public/install/currency_iso.json`;
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	let created = 0;
	for (const item of data) {
		try {
			await sqlClient.currency.create({
				data: {
					id: item.currency,
					name: item.name,
					demonym: item.demonym,
					majorSingle: item.majorSingle,
					majorPlural: item.majorPlural,
					ISOnum: item.ISOnum,
					symbol: item.symbol,
					symbolNative: item.symbolNative,
					minorSingle: item.minorSingle,
					minorPlural: item.minorPlural,
					ISOdigits: item.ISOdigits,
					decimals: item.decimals,
					numToBasic: item.numToBasic,
				},
			});
			created++;
		} catch (error) {
			console.error(`  ⚠️  Failed to create currency: ${item.currency}`, error);
		}
	}

	console.log(`  ✓ Created ${created} currencies`);
	return created;
}

async function populateLocaleData() {
	console.log("\n🌐 Populating locale data...");

	const filePath = `${process.cwd()}/public/install/locales.json`;
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	let created = 0;
	for (const item of data) {
		try {
			await sqlClient.locale.create({
				data: item,
			});
			created++;
		} catch (error) {
			console.error(`  ⚠️  Failed to create locale: ${item.id}`, error);
		}
	}

	console.log(`  ✓ Created ${created} locales`);
	return created;
}

type InstallPaymentMethodJson = {
	name: string;
	payUrl?: string;
	priceDescr?: string;
	fee?: number;
	feeAdditional?: number;
	clearDays?: number;
	isDeleted?: boolean;
	isDefault?: boolean;
	canDelete?: boolean;
	visibleToCustomer?: boolean;
	platformEnabled?: boolean;
};

type InstallShippingMethodJson = {
	name: string;
	identifier?: string;
	description?: string | null;
	basic_price?: number;
	currencyId: string;
	shipRequired?: boolean;
	isDeleted?: boolean;
	isDefault?: boolean;
	canDelete?: boolean;
};

async function resolveCurrencyIdForShipping(
	rawCurrencyId: string,
): Promise<string | null> {
	const trimmed = rawCurrencyId.trim();
	const byExact = await sqlClient.currency.findUnique({
		where: { id: trimmed },
	});
	if (byExact) {
		return byExact.id;
	}
	const upper = trimmed.toUpperCase();
	if (upper !== trimmed) {
		const byUpper = await sqlClient.currency.findUnique({
			where: { id: upper },
		});
		if (byUpper) {
			return byUpper.id;
		}
	}
	const lower = trimmed.toLowerCase();
	if (lower !== trimmed) {
		const byLower = await sqlClient.currency.findUnique({
			where: { id: lower },
		});
		if (byLower) {
			return byLower.id;
		}
	}
	return null;
}

async function populatePaymentMethodsFromInstallIfMissing() {
	console.log("\n💳 Ensuring payment methods from public/install...");

	const filePath = `${process.cwd()}/public/install/payment_methods.json`;
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file) as InstallPaymentMethodJson[];

	let created = 0;
	let skipped = 0;

	for (const c of data) {
		const payUrlNormalized = (c.payUrl ?? "").trim().toLowerCase();
		const orConditions: Prisma.PaymentMethodWhereInput[] = [{ name: c.name }];
		if (payUrlNormalized !== "") {
			orConditions.push({
				payUrl: { equals: payUrlNormalized, mode: "insensitive" },
			});
		}
		const existing = await sqlClient.paymentMethod.findFirst({
			where: { OR: orConditions },
		});
		if (existing) {
			skipped++;
			continue;
		}

		const now = getUtcNowEpoch();
		try {
			await sqlClient.paymentMethod.create({
				data: {
					name: c.name,
					payUrl: payUrlNormalized || (c.payUrl ?? ""),
					priceDescr: String(c.priceDescr ?? ""),
					fee: new Prisma.Decimal(c.fee ?? 0),
					feeAdditional: new Prisma.Decimal(c.feeAdditional ?? 0),
					clearDays: c.clearDays ?? 3,
					isDeleted: c.isDeleted ?? false,
					isDefault: c.isDefault ?? false,
					canDelete: c.canDelete ?? false,
					visibleToCustomer: c.visibleToCustomer ?? false,
					platformEnabled: c.platformEnabled ?? true,
					createdAt: now,
					updatedAt: now,
				},
			});
			created++;
		} catch (error) {
			console.error(`  ⚠️  Failed to create payment method: ${c.name}`, error);
		}
	}

	console.log(
		`  ✓ Payment methods: ${created} created, ${skipped} already present`,
	);
	return { created, skipped };
}

async function populateShippingMethodsFromInstallIfMissing() {
	console.log("\n📦 Ensuring shipping methods from public/install...");

	const filePath = `${process.cwd()}/public/install/shipping_methods.json`;
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file) as InstallShippingMethodJson[];

	let created = 0;
	let skipped = 0;
	let skippedNoCurrency = 0;

	for (const c of data) {
		const existing = await sqlClient.shippingMethod.findUnique({
			where: { name: c.name },
		});
		if (existing) {
			skipped++;
			continue;
		}

		const currencyId = await resolveCurrencyIdForShipping(c.currencyId);
		if (!currencyId) {
			console.error(
				`  ⚠️  Skipping shipping method "${c.name}": currency not found for id "${c.currencyId}"`,
			);
			skippedNoCurrency++;
			continue;
		}

		const now = getUtcNowEpoch();
		try {
			await sqlClient.shippingMethod.create({
				data: {
					name: c.name,
					identifier: c.identifier ?? "",
					description:
						c.description === undefined || c.description === ""
							? null
							: String(c.description),
					basic_price: new Prisma.Decimal(c.basic_price ?? 0),
					currencyId,
					shipRequired: c.shipRequired ?? true,
					isDeleted: c.isDeleted ?? false,
					isDefault: c.isDefault ?? false,
					canDelete: c.canDelete ?? false,
					createdAt: now,
					updatedAt: now,
				},
			});
			created++;
		} catch (error) {
			console.error(`  ⚠️  Failed to create shipping method: ${c.name}`, error);
		}
	}

	console.log(
		`  ✓ Shipping methods: ${created} created, ${skipped} already present` +
			(skippedNoCurrency > 0
				? `, ${skippedNoCurrency} skipped (missing currency)`
				: ""),
	);
	return { created, skipped, skippedNoCurrency };
}

async function checkPlatformSettings() {
	console.log("\n⚙️  Checking platform settings...");

	const settings = await sqlClient.platformSettings.findFirst();

	if (!settings) {
		console.log("  ⚠️  No platform settings found");
		console.log("  💡 You can create them manually or through the admin panel");
		return null;
	}

	if (!canCallStripeApi()) {
		console.log(
			"  ℹ️  Stripe API verification skipped (set STRIPE_SECRET_KEY and omit --skip-stripe)",
		);
		console.log(
			`     DB stripeProductId: ${settings.stripeProductId ?? "(not set)"}`,
		);
		console.log(
			`     DB stripePriceId:   ${settings.stripePriceId ?? "(not set)"}`,
		);
		if (settings.stripePriceId && !isStripePriceId(settings.stripePriceId)) {
			console.error(
				`  ⚠️  stripePriceId is not a valid Stripe price id: ${settings.stripePriceId}`,
			);
		}
	} else {
		// Verify Stripe product if configured
		if (settings.stripeProductId) {
			try {
				const product = await stripe.products.retrieve(
					settings.stripeProductId,
				);
				if (product) {
					console.log(`  ✓ Stripe product verified: ${product.name}`);
				}
			} catch {
				console.error("  ⚠️  Invalid Stripe product ID");
			}
		} else {
			console.log("  ℹ️  Stripe product not configured");
		}

		if (settings.stripePriceId) {
			if (isStripePriceId(settings.stripePriceId)) {
				try {
					const price = await stripe.prices.retrieve(settings.stripePriceId);
					console.log(
						`  ✓ Stripe price verified: ${price.id} (${price.currency} ${price.unit_amount ?? "?"})`,
					);
				} catch {
					console.error(
						`  ⚠️  Invalid Stripe price ID (re-run install without --skip-stripe to recreate): ${settings.stripePriceId}`,
					);
				}
			} else {
				console.error(
					`  ⚠️  stripePriceId is not a valid Stripe price id: ${settings.stripePriceId}`,
				);
			}
		} else {
			console.log("  ℹ️  Stripe price not configured");
		}
	}

	return settings;
}

async function wipeoutData() {
	console.log("\n🗑️  Wiping out existing data...");

	try {
		await sqlClient.locale.deleteMany();
		console.log("  ✓ Deleted all locales");

		await sqlClient.currency.deleteMany();
		console.log("  ✓ Deleted all currencies");

		await sqlClient.country.deleteMany();
		console.log("  ✓ Deleted all countries");

		console.log("\n✅ Wipeout complete");
	} catch (error) {
		console.error("❌ Error during wipeout:", error);
		throw error;
	}
}

async function runInstallation() {
	console.log("🚀 Starting installation...\n");
	console.log("=".repeat(50));

	try {
		// Check current status
		const countryCount = await sqlClient.country.count();
		const currencyCount = await sqlClient.currency.count();
		const localeCount = await sqlClient.locale.count();
		const paymentMethodCount = await sqlClient.paymentMethod.count();
		const shippingMethodCount = await sqlClient.shippingMethod.count();

		console.log("\n📊 Current Status:");
		console.log(`  Countries:          ${countryCount}`);
		console.log(`  Currencies:         ${currencyCount}`);
		console.log(`  Locales:            ${localeCount}`);
		console.log(`  Payment methods:    ${paymentMethodCount}`);
		console.log(`  Shipping methods:   ${shippingMethodCount}`);

		// Populate missing data
		if (countryCount === 0) {
			await populateCountryData();
		} else {
			console.log("\n📍 Countries already populated (skipping)");
		}

		if (currencyCount === 0) {
			await populateCurrencyData();
		} else {
			console.log("\n💰 Currencies already populated (skipping)");
		}

		if (localeCount === 0) {
			await populateLocaleData();
		} else {
			console.log("\n🌐 Locales already populated (skipping)");
		}

		await populatePaymentMethodsFromInstallIfMissing();
		await populateShippingMethodsFromInstallIfMissing();

		await ensurePlatformStripeSubscriptionPrice();

		// Check platform settings (after Stripe ensure)
		await checkPlatformSettings();

		console.log(`\n${"=".repeat(50)}`);
		console.log("✅ Installation complete!\n");

		// Show final status
		await checkInstallationStatus();
	} catch (error) {
		console.error("\n❌ Installation failed:", error);
		throw error;
	}
}

async function main() {
	try {
		if (isCheck) {
			// Just check status
			await checkInstallationStatus();
		} else if (isWipeout) {
			// Wipeout and reinstall
			console.log(
				"⚠️  WARNING: This will delete all countries, currencies, and locales!",
			);
			console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");

			await new Promise((resolve) => setTimeout(resolve, 3000));

			await wipeoutData();
			await runInstallation();
		} else {
			// Normal installation
			await runInstallation();
		}

		console.log("\n🎉 Done!");
	} catch (error) {
		console.error("\n💥 Fatal error:", error);
		process.exit(1);
	} finally {
		await sqlClient.$disconnect();
	}
}

// Run the script
main();
