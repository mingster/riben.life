import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "../fixtures/reservation.fixture";

const AUTH_META_PATH = join(process.cwd(), "e2e", ".auth", "meta.json");

function readMeta(): { userId: string } {
	return JSON.parse(readFileSync(AUTH_META_PATH, "utf-8")) as { userId: string };
}

/**
 * Phase 2: Storefront discoverability.
 *
 * Verifies that a product with isCreditTopUp=true is accessible in the storefront.
 * The product page is the primary discoverability surface; category-based menu listing
 * requires the product to be assigned to a category (an admin step outside this flow).
 */
test.describe("Phase 2 - service package storefront visibility", () => {
	test.describe.configure({ mode: "serial" });

	test("@phase2 isCreditTopUp product page is accessible from the store", async ({
		request,
		authPage,
		store,
	}) => {
		const { userId } = readMeta();

		// Create a service package product (isCreditTopUp=true, Published).
		const res = await request.post("/api/e2e/phase1-credit-topup", {
			data: { storeId: store.storeId, userId, topUpAmount: 3000 },
		});
		expect(res.ok(), `phase1 endpoint failed: ${await res.text()}`).toBeTruthy();

		const body = (await res.json()) as { productId: string; productName: string };

		// Navigate directly to the product detail page.
		await authPage.goto(`/s/${store.storeId}/product/${body.productId}`);
		await authPage.waitForLoadState("networkidle");

		// The product name should be visible on the detail page.
		await expect(authPage.getByText(body.productName).first()).toBeVisible({ timeout: 8_000 });
	});

	test("@phase2 isCreditTopUp product detail page has an Add to Cart button", async ({
		request,
		authPage,
		store,
	}) => {
		const { userId } = readMeta();

		const res = await request.post("/api/e2e/phase1-credit-topup", {
			data: { storeId: store.storeId, userId, topUpAmount: 3000 },
		});
		expect(res.ok(), `phase1 endpoint failed: ${await res.text()}`).toBeTruthy();

		const body = (await res.json()) as { productId: string };

		await authPage.goto(`/s/${store.storeId}/product/${body.productId}`);
		await authPage.waitForLoadState("networkidle");

		// "Add to cart" button should be present on the product detail page.
		await expect(
			authPage.getByRole("button", { name: /add to cart/i }),
		).toBeVisible({ timeout: 8_000 });
	});
});
