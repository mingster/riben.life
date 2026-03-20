// LINK - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
// Prisma ORM 7: PostgreSQL via driver adapter (@prisma/adapter-pg + pg Pool)

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma Client Singleton (Prisma 7 + pg adapter)
 *
 * Connection pooling: `pg.Pool` manages connections; keep a single pool per process.
 */
function createPool(): Pool {
	const connectionString = process.env.POSTGRES_URL;
	if (!connectionString) {
		throw new Error("POSTGRES_URL is not set");
	}
	return new Pool({ connectionString });
}

declare global {
	var prismaPgPool: Pool | undefined;
	var client: PrismaClient | undefined;
}

const pool = globalThis.prismaPgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
	globalThis.prismaPgPool = pool;
}

const prismaClientSingleton = () => {
	const adapter = new PrismaPg(pool);
	return new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});
};

export const sqlClient = globalThis.client ?? prismaClientSingleton();

globalThis.client = sqlClient;

if (process.env.NODE_ENV !== "production") {
	process.on("SIGTERM", async () => {
		await sqlClient.$disconnect();
		await pool.end();
	});
	process.on("SIGINT", async () => {
		await sqlClient.$disconnect();
		await pool.end();
	});
}

export default sqlClient;
