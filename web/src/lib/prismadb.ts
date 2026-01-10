// LINK - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
//import { PrismaClient as mongoPrismaClient } from "@prisma-mongo/prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as sqlPrismaClient } from "@prisma/client";
import pg from "pg";

/**
 * Prisma Client Singleton
 *
 * Connection Pooling:
 * - Prisma manages connection pooling automatically via the adapter
 * - Default pool size: 10 connections
 * - To configure, add to your DATABASE_URL:
 *   postgresql://user:pass@host:5432/db?connection_limit=5&pool_timeout=20
 *
 * For "too many connections" errors:
 * 1. Use the global singleton pattern (already implemented below)
 * 2. Reduce connection_limit in your DATABASE_URL
 * 3. Run: bun run bin/close-db-connections.ts to clean up stale connections
 * 4. Restart your dev server
 */

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
	if (process.env.NODE_ENV === "production") {
		throw new Error("POSTGRES_URL must be defined");
	} else {
		console.warn("POSTGRES_URL is missing in dev");
	}
}

// Ensure pg import works in different environments
const Pool = pg.Pool;
if (!Pool) {
	throw new Error("Failed to import pg.Pool");
}

// Parse connection string to handle SSL configuration
// In Prisma v7 with adapter, we need to configure SSL explicitly via Pool options
// and also in the connection string to ensure compatibility
const fallbackConnectionString = "postgres://localhost:5432/postgres";
let finalConnectionString = connectionString || fallbackConnectionString;

// Parse connection string to check and modify SSL parameters
let sslModeParam: string | null = null;
let shouldEnableSSL = false;

try {
	const url = new URL(finalConnectionString);
	sslModeParam = url.searchParams.get("sslmode");

	// Check environment variable for SSL preference
	const sslModeEnv = process.env.POSTGRES_SSL?.toLowerCase();

	// Determine if SSL should be enabled
	// Priority: POSTGRES_SSL env var > sslmode query param > default (disable)
	if (
		sslModeEnv === "true" ||
		sslModeEnv === "require" ||
		sslModeParam === "require"
	) {
		shouldEnableSSL = true;
		// Ensure sslmode=require is in connection string
		if (!sslModeParam || sslModeParam !== "require") {
			url.searchParams.set("sslmode", "require");
		}
	} else {
		// Disable SSL - explicitly set sslmode=disable in connection string
		shouldEnableSSL = false;
		url.searchParams.set("sslmode", "disable");
	}

	// Remove other SSL-related parameters that might interfere
	url.searchParams.delete("sslcert");
	url.searchParams.delete("sslkey");
	url.searchParams.delete("sslrootcert");
	url.searchParams.delete("sslcrl");

	// Reconstruct connection string with proper SSL mode
	finalConnectionString = url.toString();
} catch (error) {
	// If connection string is not a valid URL, try to append sslmode=disable
	// This should not happen with valid PostgreSQL connection strings
	console.warn(
		"Failed to parse connection string URL, appending sslmode=disable:",
		error,
	);
	const separator = finalConnectionString.includes("?") ? "&" : "?";
	finalConnectionString = `${finalConnectionString}${separator}sslmode=disable`;
	shouldEnableSSL = false;
}

// Configure Pool with both connection string (with sslmode) and explicit SSL option
// This ensures SSL is properly disabled even if pg library ignores connection string params
const poolConfig: pg.PoolConfig = {
	connectionString: finalConnectionString,
	// Explicitly disable SSL in Pool config (this should override connection string if needed)
	ssl: shouldEnableSSL ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
	// Check for adapter validity (basic check)
	if (!adapter) {
		throw new Error("Failed to initialize PrismaPg adapter");
	}

	return new sqlPrismaClient({
		adapter,
	});
};

declare global {
	var client: undefined | ReturnType<typeof prismaClientSingleton>;
	//var mongo: mongoPrismaClient | undefined;
}

export const sqlClient = globalThis.client ?? prismaClientSingleton();
//export const mongoClient = globalThis.mongo || new mongoPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalThis.client = sqlClient;
	//globalThis.mongo = new mongoPrismaClient();
}

// Gracefully cleanup on hot reload
if (process.env.NODE_ENV !== "production") {
	process.on("SIGTERM", async () => {
		await sqlClient.$disconnect();
	});
	process.on("SIGINT", async () => {
		await sqlClient.$disconnect();
	});
}

// Default export for compatibility
export default sqlClient;
