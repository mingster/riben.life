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
	/** Prevents duplicate SIGINT/SIGTERM handlers when the module is re-evaluated (e.g. dev HMR). */
	var __prismaDevShutdownHooksRegistered: boolean | undefined;
	/** Ensures teardown runs at most once (e.g. both signals delivered). */
	var __prismaDevShutdownDone: boolean | undefined;
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
	// Register once: re-imports/HMR add new listeners if we use process.on every time,
	// which calls pool.end() multiple times and throws from pg.
	if (!globalThis.__prismaDevShutdownHooksRegistered) {
		globalThis.__prismaDevShutdownHooksRegistered = true;

		const shutdown = async () => {
			if (globalThis.__prismaDevShutdownDone) {
				return;
			}
			globalThis.__prismaDevShutdownDone = true;
			try {
				await sqlClient.$disconnect();
			} catch {
				/* ignore */
			}
			try {
				await pool.end();
			} catch {
				/* ignore (e.g. already ended) */
			}
		};

		process.once("SIGTERM", shutdown);
		process.once("SIGINT", shutdown);
	}
}

export default sqlClient;
