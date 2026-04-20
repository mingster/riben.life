import { expect, test } from "../fixtures/reservation.fixture";
import { FacilityReservationPage } from "../pages/facility-reservation.page";

test.describe("Reservation History", () => {
	test("history page loads without error even with no reservations", async ({
		authPage,
		store,
	}) => {
		await authPage.goto(`/s/${store.storeId}/reservation/history`);
		await authPage.waitForLoadState("networkidle");

		// Should not redirect to /unv
		await expect(authPage).not.toHaveURL(/\/unv/);

		// The page heading should be visible
		await expect(
			authPage.getByRole("heading", { name: "Reservation History" }),
		).toBeVisible({ timeout: 8_000 });
	});

	test("authenticated user sees their reservation in history after creating one", async ({
		authPage,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(authPage);

		// Create a reservation
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({});
		await rsvpPage.waitForSuccess();

		// Navigate to history
		await authPage.goto(`/s/${store.storeId}/reservation/history`);
		await authPage.waitForLoadState("networkidle");

		// The facility name should appear in the reservation row (column may be
		// hidden at small viewports via "hidden sm:table-cell" — check attachment
		// rather than visibility, since we only care that the data is present).
		await expect(
			authPage.getByText(store.facilityName).first(),
		).toBeAttached({ timeout: 8_000 });
	});

	test("anonymous user sees their reservation in history via localStorage", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);

		// Create reservation anonymously
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({
			name: "History Test User",
			phone: "0955123456",
		});
		await rsvpPage.waitForSuccess();

		// Go to history (same browser context → localStorage is preserved)
		await page.goto(`/s/${store.storeId}/reservation/history`);
		await page.waitForLoadState("networkidle");

		// Reservation should appear (loaded from localStorage for anonymous users).
		// Column may be hidden at small viewports — check attachment not visibility.
		await expect(
			page.getByText(store.facilityName).first(),
		).toBeAttached({ timeout: 8_000 });
	});

	test("reservation index shows all facility cards for the store", async ({
		page,
		store,
	}) => {
		await page.goto(`/s/${store.storeId}/reservation`);
		await page.waitForLoadState("networkidle");

		// The test facility card should be shown
		await expect(page.getByText(store.facilityName)).toBeVisible({
			timeout: 8_000,
		});
	});

	test("clicking a facility card navigates to its booking page", async ({
		page,
		store,
	}) => {
		await page.goto(`/s/${store.storeId}/reservation`);
		await page.waitForLoadState("networkidle");

		await page.getByText(store.facilityName).click();
		await page.waitForLoadState("networkidle");

		await expect(page).toHaveURL(
			new RegExp(`/s/${store.storeId}/reservation/${store.facilityId}`),
		);
	});
});
