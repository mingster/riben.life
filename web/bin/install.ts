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
 */

import { promises as fs } from "node:fs";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import type { PlatformSettings } from "@prisma/client";

// Parse command line arguments
const args = process.argv.slice(2);
const isWipeout = args.includes("--wipeout");
const isCheck = args.includes("--check");

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
	
	// Verify Stripe product if configured
	if (settings.stripeProductId) {
		try {
			const product = await stripe.products.retrieve(settings.stripeProductId);
			if (product) {
				console.log(`  ✓ Stripe product verified: ${product.name}`);
			}
		} catch (error) {
			console.error("  ⚠️  Invalid Stripe product ID");
		}
	} else {
		console.log("  ℹ️  Stripe product not configured");
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
		
		// Check platform settings
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

