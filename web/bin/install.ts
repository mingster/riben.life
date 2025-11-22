#!/usr/bin/env bun
/**
 * Installation Script for riben.life Platform
 * 
 * This script initializes the platform by:
 * - Creating Stripe products and prices
 * - Populating country, currency, and locale data
 * - Setting up default payment and shipping methods
 * 
 * Usage: bun run ./bin/install.ts
 */

import { populateCountryData } from "../src/actions/sysAdmin/populate-country-data";
import { populateCurrencyData } from "../src/actions/sysAdmin/populate-currency-data";
import {
	create_locales,
	create_paymentMethods,
	create_shippingMethods,
} from "../src/actions/sysAdmin/populate-payship_defaults";
import { sqlClient } from "../src/lib/prismadb";
import { stripe } from "../src/lib/stripe/config";
import logger from "../src/lib/logger";
import type { PlatformSettings } from "../src/types";

async function createStripeProducts(setting: PlatformSettings | null) {
	console.log("Creating Stripe products and prices...");

	const product = await stripe.products.create({
		name: "riben.life subscription",
	});

	const price = await stripe.prices.create({
		currency: "twd",
		unit_amount: 30000, //NT$300
		recurring: {
			interval: "month",
		},
		product: product.id,
	});

	logger.info("stripe product created", { metadata: { product } });
	logger.info("stripe price created", { metadata: { price } });

	if (product && product !== null && product.id !== null) {
		if (setting === null) {
			await sqlClient.platformSettings.create({
				data: {
					stripeProductId: product.id as string,
					stripePriceId: price.id as string,
				},
			});
			logger.info("platform setting created", { metadata: { product, price } });
			console.log("✓ Platform settings created");
		} else {
			await sqlClient.platformSettings.update({
				where: {
					id: setting.id,
				},
				data: {
					stripeProductId: product.id as string,
					stripePriceId: price.id as string,
				},
			});
			logger.info("platform setting updated", { metadata: { setting } });
			console.log("✓ Platform settings updated");
		}
	}

	console.log(`✓ Stripe Product ID: ${product.id}`);
	console.log(`✓ Stripe Price ID: ${price.id}`);
}

async function createBaseObjects(
	countryCount: number,
	currencyCount: number,
	localeCount: number,
) {
	console.log("\nPopulating base data...");

	if (countryCount === 0) {
		await populateCountryData();
		console.log("✓ Country data populated");
	} else {
		console.log(`✓ Countries already exist (${countryCount})`);
	}

	if (currencyCount === 0) {
		await populateCurrencyData();
		console.log("✓ Currency data populated");
	} else {
		console.log(`✓ Currencies already exist (${currencyCount})`);
	}

	if (localeCount === 0) {
		await create_locales();
		console.log("✓ Locale data populated");
	} else {
		console.log(`✓ Locales already exist (${localeCount})`);
	}

	const paymentMethods = await sqlClient.paymentMethod.findMany();
	if (paymentMethods.length === 0) {
		await create_paymentMethods();
		console.log("✓ Payment methods created");
	} else {
		console.log(`✓ Payment methods already exist (${paymentMethods.length})`);
	}

	const shippingMethods = await sqlClient.shippingMethod.findMany();
	if (shippingMethods.length === 0) {
		await create_shippingMethods();
		console.log("✓ Shipping methods created");
	} else {
		console.log(`✓ Shipping methods already exist (${shippingMethods.length})`);
	}
}

async function main() {
	console.log("======================================");
	console.log("riben.life Platform Installation");
	console.log("======================================\n");

	try {
		// Check and create platform settings
		console.log("Checking platform settings...");
		const setting = await sqlClient.platformSettings.findFirst();

		if (!setting) {
			console.log("No platform settings found. Creating...");
			await createStripeProducts(null);
		} else {
			// Check if stripe product id is valid
			try {
				const product = await stripe.products.retrieve(
					setting.stripeProductId as string,
				);
				if (!product) {
					console.log("Invalid Stripe product. Recreating...");
					await createStripeProducts(setting);
				} else {
					console.log("✓ Platform settings exist and valid");
					console.log(`  Stripe Product ID: ${setting.stripeProductId}`);
					console.log(`  Stripe Price ID: ${setting.stripePriceId}`);
				}
			} catch (err) {
				logger.error(err);
				console.log("Error validating Stripe product. Recreating...");
				await createStripeProducts(setting);
			}
		}

		// Get counts
		const countryCount = await sqlClient.country.count();
		const currencyCount = await sqlClient.currency.count();
		const localeCount = await sqlClient.locale.count();

		// Create base objects
		await createBaseObjects(countryCount, currencyCount, localeCount);

		// Final summary
		console.log("\n======================================");
		console.log("Installation Summary");
		console.log("======================================");
		const finalCounts = {
			countries: await sqlClient.country.count(),
			currencies: await sqlClient.currency.count(),
			locales: await sqlClient.locale.count(),
			paymentMethods: await sqlClient.paymentMethod.count(),
			shippingMethods: await sqlClient.shippingMethod.count(),
		};

		console.log(`Countries:        ${finalCounts.countries}`);
		console.log(`Currencies:       ${finalCounts.currencies}`);
		console.log(`Locales:          ${finalCounts.locales}`);
		console.log(`Payment Methods:  ${finalCounts.paymentMethods}`);
		console.log(`Shipping Methods: ${finalCounts.shippingMethods}`);
		console.log("\n✓ Installation completed successfully!");

		process.exit(0);
	} catch (error) {
		console.error("\n✗ Installation failed:", error);
		logger.error({ message: "Installation failed", metadata: { error } });
		process.exit(1);
	}
}

// Run the installation
main();

