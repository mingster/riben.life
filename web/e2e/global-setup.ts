import type { FullConfig } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, signUpTestUser } from "./helpers/auth";

const BASE_URL = "http://localhost:3001";
export const AUTH_DIR = join(process.cwd(), "e2e", ".auth");
export const AUTH_STATE_PATH = join(AUTH_DIR, "user.json");
export const AUTH_META_PATH = join(AUTH_DIR, "meta.json");

/** Parse a single Set-Cookie string into a Playwright cookie object. */
function parseSetCookie(raw: string, domain: string) {
	const parts = raw.split(";").map((p) => p.trim());
	const eq = parts[0].indexOf("=");
	const name = parts[0].substring(0, eq);
	const value = parts[0].substring(eq + 1);

	let path = "/";
	let httpOnly = false;
	let secure = false;
	let sameSite: "Strict" | "Lax" | "None" = "Lax";
	let expires = -1;

	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower === "httponly") httpOnly = true;
		else if (lower === "secure") secure = true;
		else if (lower.startsWith("path=")) path = attr.slice(5);
		else if (lower.startsWith("samesite=")) {
			const v = attr.slice(9).trim();
			if (v === "Strict" || v === "strict") sameSite = "Strict";
			else if (v === "None" || v === "none") sameSite = "None";
			else sameSite = "Lax";
		} else if (lower.startsWith("max-age=")) {
			const maxAge = Number.parseInt(attr.slice(8), 10);
			if (!Number.isNaN(maxAge)) {
				expires = Math.floor(Date.now() / 1000) + maxAge;
			}
		} else if (lower.startsWith("expires=")) {
			const d = new Date(attr.slice(8));
			if (!Number.isNaN(d.getTime())) {
				expires = Math.floor(d.getTime() / 1000);
			}
		}
	}

	return { name, value, domain, path, expires, httpOnly, secure, sameSite };
}

export default async function globalSetup(_config: FullConfig) {
	if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

	// 1. Create test user (idempotent — no-op if already exists)
	await signUpTestUser(BASE_URL);

	// 2. Sign in via API to get session cookies + user ID
	// Better Auth requires an Origin header to prevent CSRF
	const signInRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: BASE_URL,
		},
		body: JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
	});

	if (!signInRes.ok) {
		const body = await signInRes.text();
		throw new Error(`E2E sign-in failed (${signInRes.status}): ${body}`);
	}

	const signInData = (await signInRes.json()) as { user?: { id: string } };
	const userId = signInData.user?.id;
	if (!userId) throw new Error("Sign-in response did not include user.id");

	// 3. Parse session cookies from Set-Cookie headers
	const rawCookies: string[] =
		typeof (signInRes.headers as { getSetCookie?: () => string[] }).getSetCookie ===
		"function"
			? (signInRes.headers as { getSetCookie: () => string[] }).getSetCookie()
			: // Fallback for environments where getSetCookie() is not available
				[signInRes.headers.get("set-cookie") ?? ""].filter(Boolean);

	const cookies = rawCookies.map((c) => parseSetCookie(c, "localhost"));

	// 4. Write Playwright storage state (auth cookies)
	writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies, origins: [] }, null, 2));

	// 5. Write meta file so fixtures can read the userId without importing Prisma
	writeFileSync(AUTH_META_PATH, JSON.stringify({ userId }, null, 2));
}
