import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so DATABASE_URL is available in globalSetup, fixtures, and tests.
config({ path: ".env.local" });

/**
 * E2E tests — Chromium-only by default so `playwright install` works on hosts
 * where WebKit is unavailable (e.g. older macOS).
 */
export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	globalSetup: "./e2e/global-setup.ts",
	globalTeardown: "./e2e/global-teardown.ts",
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
		storageState: "e2e/.auth/locale.json",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "bun run dev",
		url: "http://localhost:3001",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
