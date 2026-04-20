#!/usr/bin/env bun
/**
 * Script to close all database connections for the prisma_migration role
 * Run this if you're getting "too many connections" errors
 *
 * Usage: bun run bin/close-db-connections.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function closeConnections() {
	try {
		console.log("🔍 Checking active connections...");

		// Get count of active connections
		const connections = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
			SELECT count(*)
			FROM pg_stat_activity
			WHERE usename = 'prisma_migration'
			AND state = 'active';
		`);

		const count = Number(connections[0]?.count || 0);
		console.log(`📊 Found ${count} active connections`);

		if (count === 0) {
			console.log("✅ No active connections to close");
			return;
		}

		// Close all connections except the current one
		await prisma.$executeRawUnsafe(`
			SELECT pg_terminate_backend(pg_stat_activity.pid)
			FROM pg_stat_activity
			WHERE pg_stat_activity.usename = 'prisma_migration'
			AND pid <> pg_backend_pid();
		`);

		console.log("✅ Closed all active connections");
	} catch (error) {
		console.error("❌ Error:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

closeConnections()
	.then(() => {
		console.log("🎉 Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("💥 Failed:", error);
		process.exit(1);
	});
