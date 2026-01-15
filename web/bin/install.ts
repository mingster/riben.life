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
import { sqlClient, pool } from "../src/lib/prismadb";
import { stripe } from "../src/lib/stripe/config";
import logger from "../src/lib/logger";
import type { PlatformSettings } from "../src/types";
import pg from "pg";

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
		// Workaround: Use pool directly (Prisma v7 adapter issue in standalone scripts)
		const poolClient = await pool.connect();
		try {
			if (setting === null) {
				await poolClient.query(
					'INSERT INTO "PlatformSettings" ("stripeProductId", "stripePriceId") VALUES ($1, $2)',
					[product.id as string, price.id as string]
				);
				logger.info("platform setting created", { metadata: { product, price } });
				console.log("✓ Platform settings created");
			} else {
				await poolClient.query(
					'UPDATE "PlatformSettings" SET "stripeProductId" = $1, "stripePriceId" = $2 WHERE id = $3',
					[product.id as string, price.id as string, setting.id]
				);
				logger.info("platform setting updated", { metadata: { setting } });
				console.log("✓ Platform settings updated");
			}
		} finally {
			poolClient.release();
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

	// Workaround: Use pool directly (Prisma v7 adapter issue in standalone scripts)
	const poolClient = await pool.connect();
	try {
		const paymentMethodsResult = await poolClient.query<{ id: string }>('SELECT id FROM "PaymentMethod"');
		if (paymentMethodsResult.rows.length === 0) {
			await create_paymentMethods();
			console.log("✓ Payment methods created");
		} else {
			console.log(`✓ Payment methods already exist (${paymentMethodsResult.rows.length})`);
		}

		const shippingMethodsResult = await poolClient.query<{ id: string }>('SELECT id FROM "ShippingMethod"');
		if (shippingMethodsResult.rows.length === 0) {
			await create_shippingMethods();
			console.log("✓ Shipping methods created");
		} else {
			console.log(`✓ Shipping methods already exist (${shippingMethodsResult.rows.length})`);
		}
	} finally {
		poolClient.release();
	}
}

async function main() {
	console.log("======================================");
	console.log("riben.life Platform Installation");
	console.log("======================================\n");

	try {
		// Test database connection directly using pg Pool first
		// This helps diagnose connection issues before using Prisma client
		console.log("Testing database connection...");
		const connectionString = process.env.POSTGRES_URL;
		if (!connectionString) {
			throw new Error("POSTGRES_URL environment variable is not set");
		}
		
		// Parse connection string - server requires SSL but may not verify certificates
		// Keep SSL enabled but allow unverified certificates (same as psql behavior)
		let testConnectionString = connectionString;
		try {
			const url = new URL(connectionString);
			// Ensure sslmode=require is set (server requires SSL)
			if (!url.searchParams.get("sslmode")) {
				url.searchParams.set("sslmode", "require");
			}
			url.searchParams.delete("ssl"); // Remove ssl=true, use sslmode instead
			testConnectionString = url.toString();
		} catch {
			// If URL parsing fails, append sslmode=require
			const separator = connectionString.includes("?") ? "&" : "?";
			testConnectionString = `${connectionString}${separator}sslmode=require`;
		}
		
		// Test connection with a simple pg query
		// Enable SSL but don't verify certificate (server requires SSL but may have self-signed cert)
		const testPool = new pg.Pool({
			connectionString: testConnectionString,
			ssl: { rejectUnauthorized: false }, // Enable SSL but don't verify certificate
		});
		
		try {
			const testResult = await testPool.query("SELECT 1 as test");
			console.log("✓ Direct database connection successful");
			await testPool.end();
		} catch (poolError) {
			await testPool.end();
			throw new Error(
				`Database connection test failed: ${poolError instanceof Error ? poolError.message : String(poolError)}`,
			);
		}
		
		// Now connect Prisma client
		console.log("Connecting Prisma client...");
		
		// Ensure the pool has at least one active connection before using Prisma client
		// This is a workaround for Prisma v7 adapter initialization timing
		try {
			const poolClient = await pool.connect();
			await poolClient.query("SELECT 1");
			poolClient.release();
			console.log("✓ Pool connection verified");
		} catch (poolError) {
			throw new Error(
				`Pool connection failed: ${poolError instanceof Error ? poolError.message : String(poolError)}`,
			);
		}
		
		// Now connect Prisma client
		await sqlClient.$connect();
		console.log("✓ Prisma client connected successfully.\n");

		// Check and create platform settings
		console.log("Checking platform settings...");
		// Workaround for Prisma v7 adapter issue in standalone scripts:
		// Use pool directly instead of Prisma client
		const poolClient = await pool.connect();
		let setting: { id: string; stripeProductId: string | null; stripePriceId: string | null } | null = null;
		try {
			const settingsResult = await poolClient.query<{ id: string; stripeProductId: string | null; stripePriceId: string | null }>(
				'SELECT id, "stripeProductId", "stripePriceId" FROM "PlatformSettings" LIMIT 1'
			);
			setting = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;
		} finally {
			poolClient.release();
		}

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

		// Get counts (workaround: Use pool directly for Prisma v7 adapter issue in standalone scripts)
		const countClient = await pool.connect();
		let countryCount = 0;
		let currencyCount = 0;
		let localeCount = 0;
		try {
			const countryResult = await countClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Country"');
			countryCount = parseInt(countryResult.rows[0]?.count || "0", 10);
			
			const currencyResult = await countClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Currency"');
			currencyCount = parseInt(currencyResult.rows[0]?.count || "0", 10);
			
			const localeResult = await countClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Locale"');
			localeCount = parseInt(localeResult.rows[0]?.count || "0", 10);
		} finally {
			countClient.release();
		}

		// Create base objects
		await createBaseObjects(countryCount, currencyCount, localeCount);

		// Final summary
		console.log("\n======================================");
		console.log("Installation Summary");
		console.log("======================================");
		// Get final counts (workaround: Use pool directly for Prisma v7 adapter issue in standalone scripts)
		const finalCountClient = await pool.connect();
		let finalCounts: {
			countries: number;
			currencies: number;
			locales: number;
			paymentMethods: number;
			shippingMethods: number;
		};
		try {
			const [countriesResult, currenciesResult, localesResult, paymentMethodsResult, shippingMethodsResult] = await Promise.all([
				finalCountClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Country"'),
				finalCountClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Currency"'),
				finalCountClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "Locale"'),
				finalCountClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "PaymentMethod"'),
				finalCountClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "ShippingMethod"'),
			]);
			
			finalCounts = {
				countries: parseInt(countriesResult.rows[0]?.count || "0", 10),
				currencies: parseInt(currenciesResult.rows[0]?.count || "0", 10),
				locales: parseInt(localesResult.rows[0]?.count || "0", 10),
				paymentMethods: parseInt(paymentMethodsResult.rows[0]?.count || "0", 10),
				shippingMethods: parseInt(shippingMethodsResult.rows[0]?.count || "0", 10),
			};
		} finally {
			finalCountClient.release();
		}

		console.log(`Countries:        ${finalCounts.countries}`);
		console.log(`Currencies:       ${finalCounts.currencies}`);
		console.log(`Locales:          ${finalCounts.locales}`);
		console.log(`Payment Methods:  ${finalCounts.paymentMethods}`);
		console.log(`Shipping Methods: ${finalCounts.shippingMethods}`);
		console.log("\n✓ Installation completed successfully!");

		// Cleanup: disconnect Prisma client
		await sqlClient.$disconnect();
		process.exit(0);
	} catch (error) {
		console.error("\n✗ Installation failed:", error);
		logger.error({ message: "Installation failed", metadata: { error } });
		
		// Cleanup: disconnect Prisma client even on error
		try {
			await sqlClient.$disconnect();
		} catch (disconnectError) {
			// Ignore disconnect errors
		}
		process.exit(1);
	}
}

// Run the installation
main();

