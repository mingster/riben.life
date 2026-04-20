import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestStore, createTestStore, type TestStore } from "../helpers/db";

const AUTH_STATE_PATH = join(process.cwd(), "e2e", ".auth", "user.json");
const AUTH_META_PATH = join(process.cwd(), "e2e", ".auth", "meta.json");

function readMeta(): { userId: string } {
	try {
		return JSON.parse(readFileSync(AUTH_META_PATH, "utf-8")) as { userId: string };
	} catch {
		throw new Error("e2e/.auth/meta.json not found — did global-setup run?");
	}
}

type Fixtures = {
	/** A freshly created test store + facility, cleaned up after each test. */
	store: TestStore;
	/**
	 * A browser page pre-loaded with the authenticated user's session.
	 * Use for tests that require a signed-in user.
	 */
	authPage: import("@playwright/test").Page;
};

export const test = base.extend<Fixtures>({
	store: async ({}, use) => {
		const { userId } = readMeta();
		const store = await createTestStore(userId);
		await use(store);
		await cleanupTestStore(store.orgId);
	},

	authPage: async ({ browser, baseURL }, use) => {
		const context = await browser.newContext({ storageState: AUTH_STATE_PATH, baseURL });
		// Merge locale cookie so the UI renders in English (matching test assertions)
		await context.addCookies([{ name: "i18next", value: "en", domain: "localhost", path: "/" }]);
		const page = await context.newPage();
		await use(page);
		await context.close();
	},
});

export { expect };
