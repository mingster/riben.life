// LINK - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
//import { PrismaClient as mongoPrismaClient } from "@prisma-mongo/prisma/client";

import { PrismaClient as sqlPrismaClient } from "@prisma/client";
//import { withAccelerate } from "@prisma/extension-accelerate";
//import { withOptimize } from "@prisma/extension-optimize";

/**
 * Prisma Client Singleton
 *
 * Connection Pooling:
 * - Prisma manages connection pooling automatically
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
const prismaClientSingleton = () => {
	return new sqlPrismaClient({
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});
	//return new sqlPrismaClient().$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY as string}));
	//return new sqlPrismaClient().$extends(withAccelerate());
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
