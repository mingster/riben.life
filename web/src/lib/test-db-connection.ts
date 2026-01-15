/**
 * Database Connection Test Utility
 *
 * Tests database connectivity and logs connection details.
 * Useful for debugging connection issues during build or runtime.
 */

import { sqlClient } from "./prismadb";
import logger from "./logger";

export async function testDatabaseConnection(): Promise<{
	success: boolean;
	error?: string;
	details?: {
		userCount?: number;
		connectionString?: string;
	};
}> {
	try {
		// Ensure client is connected (Prisma v6 - safe to call multiple times)
		await sqlClient.$connect();

		// Test connection with a simple Prisma query
		const testUser = await sqlClient.user.findFirst({
			select: { id: true },
		});

		// Get user count
		const userCount = await sqlClient.user.count();

		// Get connection string (masked for security)
		const connectionString = process.env.POSTGRES_URL;
		const maskedConnectionString = connectionString
			? connectionString.replace(/(:\/\/[^:]+:)([^@]+)(@)/, "://***:***@")
			: "not set";

		logger.info("Database connection test successful", {
			metadata: {
				userCount,
				testUserFound: !!testUser,
				connectionString: maskedConnectionString,
			},
			tags: ["database", "connection", "test"],
		});

		return {
			success: true,
			details: {
				userCount,
				connectionString: maskedConnectionString,
			},
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		logger.error("Database connection test failed", {
			metadata: {
				error: errorMessage,
				connectionString: process.env.POSTGRES_URL
					? "set (but connection failed)"
					: "not set",
			},
			tags: ["database", "connection", "error"],
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
