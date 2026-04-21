// LINK - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
//import { PrismaClient as mongoPrismaClient } from "@prisma-mongo/prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as sqlPrismaClient } from "@prisma/client";

//import { withAccelerate } from "@prisma/extension-accelerate";
//import { withOptimize } from "@prisma/extension-optimize";

/**
 * Prisma Client Singleton (Prisma ORM 7 — driver adapter + node-pg)
 *
 * Connection pooling uses the driver’s defaults; tune via DATABASE_URL or Prisma docs if needed.
 */
function createPrismaClient() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL is not set");
	}

	const adapter = new PrismaPg({ connectionString });

	return new sqlPrismaClient({
		adapter,
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});
	//return new sqlPrismaClient({ adapter }).$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY as string}));
	//return new sqlPrismaClient({ adapter }).$extends(withAccelerate());
}

declare global {
	var client: undefined | ReturnType<typeof createPrismaClient>;
	//var mongo: mongoPrismaClient | undefined;
}

export const sqlClient = globalThis.client ?? createPrismaClient();
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
