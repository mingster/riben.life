import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
	test("home redirects to shop", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL(/\/shop/);
	});
});
