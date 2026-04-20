import { expect, test } from "../fixtures/reservation.fixture";
import { FacilityReservationPage } from "../pages/facility-reservation.page";

test.describe("Reservation Form Validation", () => {
	test("submit button is disabled before date and time are selected", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await expect(rsvpPage.submitButton).toBeDisabled();
	});

	test("submit button is still disabled after date but before time is selected", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.selectDate(5);
		// Time not yet selected
		await expect(rsvpPage.submitButton).toBeDisabled();
	});

	test("submit button is disabled for anonymous user without name", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.selectDate(5);
		await rsvpPage.selectTime("10:00 AM");
		// Fill phone but not name
		await rsvpPage.fillPhone("0912345678");

		await expect(rsvpPage.submitButton).toBeDisabled();
	});

	test("submit button is disabled for anonymous user without phone", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.selectDate(5);
		await rsvpPage.selectTime("10:00 AM");
		// Fill name but not phone
		await rsvpPage.fillName("Test Customer");

		await expect(rsvpPage.submitButton).toBeDisabled();
	});

	test("submit button becomes enabled once all required anonymous fields are filled", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.selectDate(5);
		await rsvpPage.selectTime("10:00 AM");
		await rsvpPage.fillName("Test Customer");
		await rsvpPage.fillPhone("0912345678");

		await expect(rsvpPage.submitButton).toBeEnabled();
	});

	test("past dates are disabled in the calendar", async ({ page, store }) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const dayText = yesterday.getDate().toString();

		// Find a calendar button for yesterday — it must be disabled
		const yesterdayBtn = page
			.locator("button[type='button']")
			.filter({ hasText: new RegExp(`^${dayText}$`) })
			.first();

		await expect(yesterdayBtn).toBeDisabled();
	});

	test("facility name is shown in the page header", async ({ page, store }) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			store.facilityName,
		);
	});

	test("time slots appear after a date is selected", async ({ page, store }) => {
		const rsvpPage = new FacilityReservationPage(page);
		await rsvpPage.goto(store.storeId, store.facilityId);

		await rsvpPage.selectDate(5);

		// At least the 10:00 AM slot should be visible (default 08:00–22:00 when no business hours)
		await expect(
			page.getByRole("button", { name: "10:00 AM", exact: true }),
		).toBeVisible({ timeout: 5_000 });
	});

	test("unknown store ID redirects away from the booking page", async ({ page }) => {
		// The s/[storeId]/layout.tsx redirects unknown stores to /storeAdmin,
		// which for anonymous users then redirects to /signIn?callbackUrl=/storeAdmin.
		// The point of the test is just that we don't stay on the (non-existent) booking page.
		await page.goto(
			"/s/00000000-0000-0000-0000-000000000000/reservation/00000000-0000-0000-0000-000000000000",
		);
		await expect(page).not.toHaveURL(
			/\/s\/00000000-0000-0000-0000-000000000000\/reservation\//,
			{ timeout: 8_000 },
		);
	});
});
