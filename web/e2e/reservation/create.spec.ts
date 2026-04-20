import { expect, test } from "../fixtures/reservation.fixture";
import { FacilityReservationPage } from "../pages/facility-reservation.page";

test.describe("Create Reservation", () => {
	test("anonymous user can create a reservation with name and phone", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.createReservation({
			name: "Test Customer",
			phone: "0912345678",
		});

		await rsvpPage.waitForSuccess();
	});

	test("authenticated user can create a reservation without name/phone fields", async ({
		authPage,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(authPage);
		await rsvpPage.goto(store.storeId, store.facilityId);

		// Name and phone inputs should not be rendered for logged-in users
		await expect(authPage.locator('input[type="tel"]')).not.toBeVisible();

		// Authenticated users do not need name/phone — omit them
		await rsvpPage.createReservation({});

		await rsvpPage.waitForSuccess();
	});

	test("facility index page shows facility card link", async ({ page, store }) => {
		await page.goto(`/s/${store.storeId}/reservation`);
		await page.waitForLoadState("networkidle");

		// The facility card should appear on the index
		await expect(page.getByText(store.facilityName)).toBeVisible({ timeout: 8_000 });
	});

	test("prepaid flow: no prepay required → stays on page after success", async ({
		page,
		store,
	}) => {
		// rsvpSettings.minPrepaidPercentage = 0 (set in createTestStore)
		// so no redirect to checkout should occur
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.createReservation({
			name: "No Prepay User",
			phone: "0923456789",
		});

		await rsvpPage.waitForSuccess();

		// Should stay on the facility reservation page, not /checkout
		await expect(page).not.toHaveURL(/\/checkout/);
	});
});
