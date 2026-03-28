#!/usr/bin/env bun
/**
 * Installation Script
 *
 * This script initializes the database with default data:
 * - Countries (ISO 3166)
 * - Currencies (ISO 4217)
 * - Locales
 * - Platform settings
 *
 * Usage:
 *   bun run bin/install.ts              # Run full installation
 *   bun run bin/install.ts --wipeout    # Wipeout and reinstall
 *   bun run bin/install.ts --check      # Check installation status
 *   bun run bin/install.ts --skip-stripe  # Skip Stripe product/price setup (no STRIPE_SECRET_KEY)
 *
 * Subscription price (when creating in Stripe):
 *   Default: NT$300/month — currency `twd`, unit_amount 30000 (Stripe TWD uses 1/100 dollar; 300 = NT$3).
 *   INSTALL_SUBSCRIPTION_CURRENCY       # default twd
 *   INSTALL_SUBSCRIPTION_UNIT_AMOUNT    # Stripe smallest unit: twd 30000 = NT$300; usd 300 = US$3.00 (cents)
 *   INSTALL_SUBSCRIPTION_PRODUCT_NAME   # default "Riben store subscription"
 * Or pin an existing Stripe price:
 *   INSTALL_STRIPE_PRICE_ID             # e.g. price_xxx — must exist in the connected Stripe account
 */

import { promises as fs } from "node:fs";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";

/** Platform store subscription default currency (lowercase ISO). */
const DEFAULT_PLATFORM_SUBSCRIPTION_CURRENCY = "twd";
/**
 * Default NT$300/mo for `twd`. Stripe stores TWD in the smallest unit (×100): 30000 → NT$300, 300 → NT$3.
 */
const DEFAULT_PLATFORM_SUBSCRIPTION_UNIT_AMOUNT = 30000;

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

/**
 * Ensures PlatformSettings has a valid Stripe recurring price for store subscriptions.
 * Creates a product + monthly price when missing, placeholder, or not found in Stripe.
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

	console.log("\n💳 Ensuring platform Stripe subscription price...");

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
			const productId =
				typeof price.product === "string"
					? price.product
					: price.product.id;
			await upsertPlatformStripeIds(productId, price.id);
			console.log(`  ✓ Using INSTALL_STRIPE_PRICE_ID: ${price.id}`);
			return;
		} catch (err: unknown) {
			console.error(
				"  ⚠️  INSTALL_STRIPE_PRICE_ID not found in Stripe:",
				err instanceof Error ? err.message : err,
			);
			return;
		}
	}

	const settings = await sqlClient.platformSettings.findFirst();
	const currentPriceId = settings?.stripePriceId?.trim() ?? "";

	if (currentPriceId && isStripePriceId(currentPriceId)) {
		try {
			await stripe.prices.retrieve(currentPriceId);
			console.log(`  ✓ Existing platform stripePriceId is valid: ${currentPriceId}`);
			return;
		} catch {
			console.log(
				`  ⚠️  Stored stripePriceId invalid in Stripe (${currentPriceId}) — creating a new price`,
			);
		}
	} else if (currentPriceId) {
		console.log(
			`  ⚠️  Stored stripePriceId is not a real Stripe price id (${currentPriceId}) — creating a new price`,
		);
	}

	const currency = (
		process.env.INSTALL_SUBSCRIPTION_CURRENCY?.trim() ||
		DEFAULT_PLATFORM_SUBSCRIPTION_CURRENCY
	).toLowerCase();
	const unitAmountRaw =
		process.env.INSTALL_SUBSCRIPTION_UNIT_AMOUNT?.trim() ??
		String(DEFAULT_PLATFORM_SUBSCRIPTION_UNIT_AMOUNT);
	const unitAmount = Number.parseInt(unitAmountRaw, 10);
	if (Number.isNaN(unitAmount) || unitAmount <= 0) {
		console.error(
			`  ⚠️  INSTALL_SUBSCRIPTION_UNIT_AMOUNT must be a positive integer, got: ${unitAmountRaw}`,
		);
		return;
	}

	if (currency === "usd" && unitAmount === 300) {
		console.error(
			"  ⚠️  Refusing to create price: USD unit_amount is in cents, so 300 = US$3.00/month.",
		);
		console.error(
			"     For US$300/mo use INSTALL_SUBSCRIPTION_UNIT_AMOUNT=30000; for NT$300/mo use twd + 30000 (default).",
		);
		return;
	}

	if (currency === "twd" && unitAmount === 300) {
		console.error(
			"  ⚠️  Refusing to create price: Stripe TWD uses 1/100 NT$ (same idea as cents). unit_amount 300 = NT$3/mo, not NT$300.",
		);
		console.error(
			"     For NT$300/mo use INSTALL_SUBSCRIPTION_UNIT_AMOUNT=30000 or omit for default.",
		);
		return;
	}

	const productName =
		process.env.INSTALL_SUBSCRIPTION_PRODUCT_NAME?.trim() ||
		"riben.life store subscription";

	const twdMajorForDisplay =
		currency === "twd" ? unitAmount / 100 : null;
	const priceNickname =
		currency === "twd" && twdMajorForDisplay !== null
			? `NT$${Number.isInteger(twdMajorForDisplay) ? twdMajorForDisplay : twdMajorForDisplay.toFixed(2)}/month`
			: `${currency.toUpperCase()} ${unitAmount}/month`;

	try {
		const price = await stripe.prices.create({
			currency,
			unit_amount: unitAmount,
			recurring: { interval: "month" },
			product_data: { name: productName },
			nickname: priceNickname,
		});
		const productId =
			typeof price.product === "string" ? price.product : price.product.id;

		await upsertPlatformStripeIds(productId, price.id);
		console.log(`  ✓ Created Stripe product ${productId}`);
		if (currency === "twd" && twdMajorForDisplay !== null) {
			const shown = Number.isInteger(twdMajorForDisplay)
				? String(twdMajorForDisplay)
				: twdMajorForDisplay.toFixed(2);
			console.log(
				`  ✓ Created recurring price ${price.id} (NT$${shown}/month, unit_amount ${unitAmount}, twd)`,
			);
		} else {
			console.log(
				`  ✓ Created recurring price ${price.id} (${unitAmount} ${currency}/month; check Stripe docs for whether amount is cents or whole units)`,
			);
		}
	} catch (err: unknown) {
		console.error(
			"  ❌ Failed to create Stripe subscription price:",
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
		const platformSettings = await sqlClient.platformSettings.findFirst();

		console.log(`✓ Countries:        ${countryCount} records`);
		console.log(`✓ Currencies:       ${currencyCount} records`);
		console.log(`✓ Locales:          ${localeCount} records`);
		console.log(`✓ Platform Settings: ${platformSettings ? "Configured" : "Not configured"}`);

		if (platformSettings) {
			console.log(`\n  Stripe Product ID: ${platformSettings.stripeProductId || "Not set"}`);
			console.log(`  Stripe Price ID:   ${platformSettings.stripePriceId || "Not set"}`);
		}

		const isInstalled = countryCount > 0 && currencyCount > 0 && localeCount > 0;

		if (isInstalled) {
			console.log("\n✅ Installation is complete!");
		} else {
			console.log("\n⚠️  Installation is incomplete. Run: bun run bin/install.ts");
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
		console.log(`     DB stripePriceId:   ${settings.stripePriceId ?? "(not set)"}`);
		if (settings.stripePriceId && !isStripePriceId(settings.stripePriceId)) {
			console.error(
				`  ⚠️  stripePriceId is not a valid Stripe price id: ${settings.stripePriceId}`,
			);
		}
	} else {
		// Verify Stripe product if configured
		if (settings.stripeProductId) {
			try {
				const product = await stripe.products.retrieve(settings.stripeProductId);
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
	console.log("=" .repeat(50));

	try {
		// Check current status
		const countryCount = await sqlClient.country.count();
		const currencyCount = await sqlClient.currency.count();
		const localeCount = await sqlClient.locale.count();

		console.log("\n📊 Current Status:");
		console.log(`  Countries:  ${countryCount}`);
		console.log(`  Currencies: ${currencyCount}`);
		console.log(`  Locales:    ${localeCount}`);

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

		await ensurePlatformStripeSubscriptionPrice();

		// Check platform settings (after Stripe ensure)
		await checkPlatformSettings();

		console.log("\n" + "=".repeat(50));
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
			console.log("⚠️  WARNING: This will delete all countries, currencies, and locales!");
			console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");

			await new Promise(resolve => setTimeout(resolve, 3000));

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

