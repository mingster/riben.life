#!/usr/bin/env bun

/**
 * Database Connection Test Script
 * 
 * Tests database connectivity and provides diagnostic information.
 * 
 * Usage: bun run bin/test-db-connection.ts
 */

import { testDatabaseConnection } from "../src/lib/test-db-connection";
import { sqlClient } from "../src/lib/prismadb";

async function main() {
	console.log("Testing database connection...\n");

	// Check environment variable
	const postgresUrl = process.env.POSTGRES_URL;
	if (!postgresUrl) {
		console.error("❌ POSTGRES_URL environment variable is not set");
		console.log("\nPlease set POSTGRES_URL in your .env.local file:");
		console.log("POSTGRES_URL=postgresql://user:password@host:5432/database");
		process.exit(1);
	}

	// Mask password in connection string for display
	const maskedUrl = postgresUrl.replace(
		/(:\/\/[^:]+:)([^@]+)(@)/,
		"://***:***@",
	);
	console.log(`Connection string: ${maskedUrl}`);
	console.log(`SSL mode: ${process.env.POSTGRES_SSL || "not set (default: disable)"}`);
	console.log("");

	// Test connection
	const result = await testDatabaseConnection();

	if (result.success) {
		console.log("✅ Database connection successful!");
		if (result.details) {
			console.log(`   User count: ${result.details.userCount}`);
		}
	} else {
		console.error("❌ Database connection failed!");
		console.error(`   Error: ${result.error}`);
		console.log("\nTroubleshooting:");
		console.log("1. Verify POSTGRES_URL is correct");
		console.log("2. Check if database server is running");
		console.log("3. Verify network connectivity to database host");
		console.log("4. Check database credentials");
		console.log("5. Verify SSL settings (POSTGRES_SSL environment variable)");
		process.exit(1);
	}

	// Test a simple query using Prisma client
	try {
		console.log("\nTesting database query execution...");
		
		// Ensure client is connected
		await sqlClient.$connect();
		
		// Test with a simple Prisma query
		const testUser = await sqlClient.user.findFirst({
			select: { id: true },
		});
		
		console.log("✅ Database query execution successful");
		console.log(`   Test user found: ${testUser ? "Yes" : "No"}`);
		
		// Get user count
		const userCount = await sqlClient.user.count();
		console.log(`   Total users: ${userCount}`);
	} catch (error) {
		console.error("❌ Database query execution failed");
		console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			console.error(`   Stack: ${error.stack}`);
		}
		process.exit(1);
	}

	// Cleanup
	await sqlClient.$disconnect();
	console.log("\n✅ All tests passed!");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
