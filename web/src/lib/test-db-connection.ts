/**
 * Database Connection Test Utility
 * 
 * Tests database connectivity and logs connection details.
 * Useful for debugging connection issues during build or runtime.
 */

import { sqlClient, pool } from "./prismadb";
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
		// Ensure client is connected (Prisma v7 with adapter requires explicit connection)
		// This is safe to call multiple times - it won't reconnect if already connected
		await sqlClient.$connect();
		
		// Workaround for Prisma v7 adapter issue in standalone scripts:
		// Use pool directly instead of Prisma client queries
		const poolClient = await pool.connect();
		let userCount = 0;
		try {
			// Test connection and get user count
			// Use lowercase table name (PostgreSQL table names are case-sensitive)
			const userResult = await poolClient.query<{ id: string }>('SELECT id FROM "user" LIMIT 1');
			const countResult = await poolClient.query<{ count: string }>('SELECT COUNT(*) as count FROM "user"');
			userCount = parseInt(countResult.rows[0]?.count || "0", 10);
		} finally {
			poolClient.release();
		}
		
		// Get connection string (masked for security)
		const connectionString = process.env.POSTGRES_URL;
		const maskedConnectionString = connectionString
			? connectionString.replace(
					/(:\/\/[^:]+:)([^@]+)(@)/,
					"://***:***@",
				)
			: "not set";

		logger.info("Database connection test successful", {
			metadata: {
				userCount,
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
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		
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
