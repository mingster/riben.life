import { expect, test } from "../fixtures/reservation.fixture";
import { FacilityReservationPage } from "../pages/facility-reservation.page";

/**
 * Cancel / Delete Reservation tests.
 *
 * With minPrepaidPercentage=0, newly created reservations have ReadyToConfirm status.
 * ReadyToConfirm reservations are treated as "delete" (no refund needed), so clicking
 * the cancel/delete icon and confirming calls deleteReservationAction.
 *
 * The action icon in the table is an <svg> rendered as role="img" with
 * title="Cancel Reservation" (same icon for both delete and cancel flows).
 * The dialog confirm button text is "Confirm".
 */

/** Locates the cancel/delete action icon in the history table. */
function cancelIcon(page: import("@playwright/test").Page) {
	return page.getByRole("img", { name: "Cancel Reservation" }).first();
}

test.describe("Delete Reservation", () => {
	test("authenticated user can delete a pending reservation from history", async ({
		authPage,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(authPage);

		// Step 1: create a reservation
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({});
		await rsvpPage.waitForSuccess();

		// Step 2: navigate to history
		await authPage.goto(`/s/${store.storeId}/reservation/history`);
		await authPage.waitForLoadState("networkidle");

		// Step 3: click the cancel/delete icon (renders as img with title "Cancel Reservation")
		await cancelIcon(authPage).click();

		// Step 4: confirm in the dialog
		await authPage.getByRole("button", { name: "Confirm" }).click();

		// Step 5: success toast
		await expect(
			authPage.getByText("Reservation deleted successfully!"),
		).toBeVisible({ timeout: 10_000 });
	});

	test("anonymous user can delete their pending reservation from history", async ({
		page,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(page);

		// Step 1: create reservation anonymously
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({
			name: "Cancel Test User",
			phone: "0987654321",
		});
		await rsvpPage.waitForSuccess();

		// Step 2: navigate to history (anonymous users rely on localStorage)
		await page.goto(`/s/${store.storeId}/reservation/history`);
		await page.waitForLoadState("networkidle");

		// Step 3: delete
		await cancelIcon(page).click();
		await page.getByRole("button", { name: "Confirm" }).click();

		// Step 4: success toast
		await expect(
			page.getByText("Reservation deleted successfully!"),
		).toBeVisible({ timeout: 10_000 });
	});
});

test.describe("Cancel Reservation", () => {
	test("cancel button is present for a ReadyToConfirm reservation", async ({
		authPage,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(authPage);

		// Create a reservation (status = ReadyToConfirm — no prepay required)
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({});
		await rsvpPage.waitForSuccess();

		// Navigate to history
		await authPage.goto(`/s/${store.storeId}/reservation/history`);
		await authPage.waitForLoadState("networkidle");

		// The cancel/delete icon should be visible for ReadyToConfirm reservations
		await expect(cancelIcon(authPage)).toBeVisible({ timeout: 8_000 });
	});

	test("cancelling a ReadyToConfirm reservation shows success toast", async ({
		authPage,
		store,
	}) => {
		const rsvpPage = new FacilityReservationPage(authPage);

		// Create reservation
		await rsvpPage.goto(store.storeId, store.facilityId);
		await rsvpPage.createReservation({});
		await rsvpPage.waitForSuccess();

		// Go to history
		await authPage.goto(`/s/${store.storeId}/reservation/history`);
		await authPage.waitForLoadState("networkidle");

		// Click the cancel/delete icon and confirm
		await cancelIcon(authPage).click();
		await authPage.getByRole("button", { name: "Confirm" }).click();

		// ReadyToConfirm → delete action → "Reservation deleted successfully!"
		await expect(
			authPage.getByText(/deleted successfully|cancelled successfully/i),
		).toBeVisible({ timeout: 10_000 });
	});
});
