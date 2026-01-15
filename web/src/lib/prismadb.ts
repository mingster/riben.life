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
let sslParam: string | null = null;
let shouldEnableSSL = false;

try {
	const url = new URL(finalConnectionString);
	sslModeParam = url.searchParams.get("sslmode");
	sslParam = url.searchParams.get("ssl");

	// Check environment variable for SSL preference
	const sslModeEnv = process.env.POSTGRES_SSL?.toLowerCase();

	// Determine if SSL should be enabled
	// Priority: POSTGRES_SSL env var > ssl=true in connection string > sslmode query param > default (disable)
	const sslEnabledByEnv = sslModeEnv === "true" || sslModeEnv === "require";
	const sslEnabledByParam = sslParam === "true" || sslModeParam === "require";

	if (sslEnabledByEnv || sslEnabledByParam) {
		shouldEnableSSL = true;
		// Ensure sslmode=require is in connection string
		if (!sslModeParam || sslModeParam !== "require") {
			url.searchParams.set("sslmode", "require");
		}
		// Remove ssl=true if present (sslmode takes precedence)
		if (sslParam === "true") {
			url.searchParams.delete("ssl");
		}
	} else if (sslParam === "false" || sslModeParam === "disable") {
		// Explicitly disable SSL
		shouldEnableSSL = false;
		url.searchParams.set("sslmode", "disable");
		// Remove ssl=false if present (sslmode takes precedence)
		if (sslParam === "false") {
			url.searchParams.delete("ssl");
		}
	} else {
		// Default: disable SSL if not explicitly set
		shouldEnableSSL = false;
		// Only set sslmode=disable if sslmode is not already set
		if (!sslModeParam) {
			url.searchParams.set("sslmode", "disable");
		}
		// Remove ssl parameter if present (sslmode takes precedence)
		if (sslParam) {
			url.searchParams.delete("ssl");
		}
	}

	// Log SSL configuration in development for debugging
	if (process.env.NODE_ENV !== "production") {
		console.log(`[Prisma] SSL configuration: ${shouldEnableSSL ? "enabled" : "disabled"} (env: ${sslModeEnv || "not set"}, ssl param: ${sslParam || "not set"}, sslmode param: ${sslModeParam || "not set"})`);
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

// Suppress deprecation warning for Bun's Promise implementation
// This is a known issue with Bun and pg library - Bun uses a custom Promise implementation
// The warning is harmless but will be removed in future pg versions
// We suppress it here to reduce noise in logs
const originalEmitWarning = process.emitWarning;
let pool: pg.Pool;
try {
	// process.emitWarning has complex overloads, but this works at runtime
	process.emitWarning = function (warning: any, ...args: any[]) {
		if (
			typeof warning === "string" &&
			warning.includes("Passing a custom Promise implementation")
		) {
			// Suppress this specific warning
			return;
		}
		return originalEmitWarning.apply(process, [warning, ...args] as any);
	};

	pool = new Pool(poolConfig);
} finally {
	// Always restore original emitWarning
	process.emitWarning = originalEmitWarning;
}

// Export pool for testing/debugging (useful for standalone scripts)
export { pool };

// Add error handlers to pool for better diagnostics
pool.on("error", (err) => {
	console.error("Unexpected error on idle database client", err);
});

pool.on("connect", () => {
	if (process.env.NODE_ENV !== "production") {
		console.log("Database connection established");
	}
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
	// Check for adapter validity (basic check)
	if (!adapter) {
		throw new Error("Failed to initialize PrismaPg adapter");
	}

	const client = new sqlPrismaClient({
		adapter,
	});

	// Add connection error handling
	client.$on("error" as never, (e: unknown) => {
		console.error("Prisma Client error:", e);
	});

	return client;
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

// Export connection info for diagnostics (masked)
export function getConnectionInfo() {
	const connectionString = process.env.POSTGRES_URL;
	return {
		isSet: !!connectionString,
		maskedUrl: connectionString
			? connectionString.replace(/(:\/\/[^:]+:)([^@]+)(@)/, "://***:***@")
			: "not set",
		sslMode: process.env.POSTGRES_SSL || "not set (default: disable)",
		poolSize: pool.totalCount,
		idleCount: pool.idleCount,
		waitingCount: pool.waitingCount,
	};
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
