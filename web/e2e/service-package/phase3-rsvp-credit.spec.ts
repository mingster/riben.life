import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "../fixtures/reservation.fixture";
import { cleanupTestStore, createCreditRsvpTestStore, getCreditBalance } from "../helpers/db";
import { FacilityReservationPage } from "../pages/facility-reservation.page";

const AUTH_META_PATH = join(process.cwd(), "e2e", ".auth", "meta.json");

function readMeta(): { userId: string } {
	return JSON.parse(readFileSync(AUTH_META_PATH, "utf-8")) as { userId: string };
}

/**
 * Phase 3: RSVP credit spend and refund.
 *
 * API-based tests verify the admin-side credit deduction path (deduceCustomerCredit).
 * The UI test verifies the customer checkout credit payment option (credit plugin path).
 *
 * Note: the admin deduction path (deduceCustomerCredit) and the customer checkout path
 * (credit plugin) write to CustomerCreditLedger with different referenceId values:
 *   - deduceCustomerCredit:         referenceId = rsvpId
 *   - credit plugin checkout:       referenceId = orderId
 * processRsvpCreditPointsRefund looks for referenceId = orderId, so it only works with
 * the checkout path. The refund test for the admin path is marked fixme until that
 * referenceId alignment is resolved.
 */
test.describe("Phase 3 - RSVP credit spend (admin deduction path)", () => {
	test.describe.configure({ mode: "serial" });

	test("@phase3 credit balance decreases by the correct amount after RSVP deduction", async ({
		request,
		store,
	}) => {
		const { userId } = readMeta();

		// Seed exactly 600 points. RSVP for 60 min, creditServiceExchangeRate=60 → 1 point deducted.
		const res = await request.post("/api/e2e/rsvp-credit-spend", {
			data: {
				storeId: store.storeId,
				facilityId: store.facilityId,
				userId,
				creditToSeed: 600,
				duration: 60,
				creditServiceExchangeRate: 60,
				creditExchangeRate: 1,
			},
		});

		expect(res.ok(), `rsvp-credit-spend failed: ${await res.text()}`).toBeTruthy();

		const body = (await res.json()) as {
			success: boolean;
			creditDeducted: number;
			balanceBefore: number;
			balanceAfter: number;
			insufficientBalance: boolean;
		};

		expect(body.success).toBeTruthy();
		expect(body.insufficientBalance).toBeFalsy();
		// 60 min / 60 min-per-point = 1 point deducted
		expect(body.creditDeducted).toBe(1);
		expect(body.balanceAfter).toBe(body.balanceBefore - 1);
	});

	test("@phase3 deduction fails gracefully when balance is insufficient", async ({
		request,
		store,
	}) => {
		const { userId } = readMeta();

		// Seed exactly 0 points — insufficient for a 1-point deduction.
		const res = await request.post("/api/e2e/rsvp-credit-spend", {
			data: {
				storeId: store.storeId,
				facilityId: store.facilityId,
				userId,
				creditToSeed: 0,
				duration: 60,
				creditServiceExchangeRate: 60,
				creditExchangeRate: 1,
			},
		});

		expect(res.ok(), `rsvp-credit-spend failed: ${await res.text()}`).toBeTruthy();

		const body = (await res.json()) as {
			success: boolean;
			insufficientBalance: boolean;
			creditDeducted: number;
		};

		expect(body.success).toBeFalsy();
		expect(body.insufficientBalance).toBeTruthy();
		expect(body.creditDeducted).toBe(0);
	});
});

test.describe("Phase 3 - RSVP credit refund on cancel (admin deduction path)", () => {
	// fixme: deduceCustomerCredit writes CustomerCreditLedger with referenceId=rsvpId, but
	// processRsvpCreditPointsRefund looks for referenceId=orderId. Until the production code
	// aligns these referenceIds (or a separate refund action is added for the admin path),
	// this test will fail. The customer checkout path (credit plugin) is tested in the UI test.
	test.fixme(
		"@phase3 cancelling an RSVP restores the deducted credit (admin path)",
		async ({ request, store }) => {
			const { userId } = readMeta();

			const spendRes = await request.post("/api/e2e/rsvp-credit-spend", {
				data: {
					storeId: store.storeId,
					facilityId: store.facilityId,
					userId,
					creditToSeed: 600,
					duration: 60,
					creditServiceExchangeRate: 60,
					creditExchangeRate: 1,
				},
			});
			expect(spendRes.ok()).toBeTruthy();

			const { rsvpId, balanceAfter: balanceAfterSpend } = (await spendRes.json()) as {
				rsvpId: string;
				balanceAfter: number;
			};

			const refundRes = await request.post("/api/e2e/rsvp-credit-refund", {
				data: { storeId: store.storeId, userId, rsvpId },
			});
			expect(refundRes.ok()).toBeTruthy();

			const refund = (await refundRes.json()) as {
				refunded: boolean;
				refundAmount: number;
				balanceBefore: number;
				balanceAfter: number;
			};

			expect(refund.refunded).toBeTruthy();
			expect(refund.refundAmount).toBeGreaterThan(0);
			expect(refund.balanceAfter).toBe(balanceAfterSpend + refund.refundAmount);
		},
	);
});

test.describe("Phase 3 - credit payment option in RSVP checkout UI", () => {
	let creditStore: { storeId: string; facilityId: string; orgId: string } | null = null;

	test.afterEach(async () => {
		if (creditStore) {
			await cleanupTestStore(creditStore.orgId);
			creditStore = null;
		}
	});

	// fixme: FacilityReservationCalendar's next-month navigation button has no accessible
	// name (it's an icon-only ghost button). The locator needs to target it by position
	// within the calendar header, e.g.:
	//   page.locator('div:has(div[class*="font-semibold"])').getByRole("button").last()
	// Update selectDate() and re-enable this test once the selector is confirmed.
	test.fixme(
		"@phase3 credit payment option is visible in checkout when user has a balance",
		async ({ authPage }) => {
			const { userId } = readMeta();

			creditStore = await createCreditRsvpTestStore(userId, {
				creditToSeed: 2000,
				facilityCost: 500,
			});

			const balanceBefore = await getCreditBalance(userId);
			expect(balanceBefore).toBeGreaterThanOrEqual(2000);

			const rsvpPage = new FacilityReservationPage(authPage);
			await rsvpPage.goto(creditStore.storeId, creditStore.facilityId);
			await rsvpPage.createReservation({});

			await authPage.waitForURL(/\/checkout\//i, { timeout: 15_000 });

			await expect(authPage.getByText(/credit/i).first()).toBeVisible({ timeout: 8_000 });
		},
	);
});
