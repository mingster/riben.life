/**
 * Prisma ORM 7 — CLI config (migrations, db push, generate).
 * Runtime connection uses DATABASE_URL + @prisma/adapter-pg in src/lib/prismadb.ts
 *
 * Loads `.env` then `.env.local` (override), same as typical Next.js local setup.
 * Default `dotenv/config` only reads `.env`, so `DATABASE_URL` in `.env.local` was ignored during `prisma generate`.
 */

import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.local"), override: true });

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
