import type { Page } from "@playwright/test";

/**
 * Page object for /s/[storeId]/reservation/[facilityId].
 *
 * The form has two phases:
 *   1. Pick a date (calendar) → pick a time slot (buttons).
 *   2. For anonymous users: fill name + phone.
 *   3. Click "Create Reservation".
 *
 * When businessHours is null the calendar shows all future dates as available
 * and the time slots default to 08:00–22:00 hourly.
 */
export class FacilityReservationPage {
	constructor(private readonly page: Page) {}

	/** Navigate to the facility booking page. */
	async goto(storeId: string, facilityId: string) {
		await this.page.goto(`/s/${storeId}/reservation/${facilityId}`);
		await this.page.waitForLoadState("networkidle");
	}

	/**
	 * Clicks a calendar date that is `daysFromNow` days in the future.
	 * After clicking, waits for time slot buttons to appear, confirming the date was accepted.
	 */
	async selectDate(daysFromNow = 7) {
		const target = new Date();
		target.setDate(target.getDate() + daysFromNow);
		const dayText = target.getDate().toString();

		// Wait for the calendar to render enabled day buttons
		await this.page
			.locator("button[type='button']")
			.filter({ hasText: /^\d{1,2}$/ })
			.first()
			.waitFor({ timeout: 10_000 });

		// Click the target date button (first non-disabled match)
		await this.page.getByRole("button", { name: dayText, exact: true }).click();

		// Wait for AM time slot buttons to appear, confirming the date selection took effect.
		// Time slot buttons use shadcn Button (data-slot="button") without explicit type="button".
		await this.page
			.locator("button[data-slot='button']")
			.filter({ hasText: /AM$/ })
			.first()
			.waitFor({ timeout: 8_000 });
	}

	/** Clicks the time-slot button. Label is locale-formatted (e.g. "10:00 AM" in English). */
	async selectTime(slot = "10:00 AM") {
		await this.page.getByRole("button", { name: slot, exact: true }).click();
	}

	/** Fills the name input (shown only for anonymous users). */
	async fillName(name: string) {
		await this.page.locator('input[placeholder*="name" i]').first().fill(name);
	}

	/**
	 * Fills the phone local-number input (shown only for anonymous users).
	 * Country code selector defaults to +886; pass a Taiwan local number like "0912345678".
	 */
	async fillPhone(localNumber: string) {
		await this.page.locator('input[type="tel"]').fill(localNumber);
	}

	/** The "Create Reservation" submit button. */
	get submitButton() {
		return this.page.getByRole("button", { name: "Create Reservation" });
	}

	/** Clicks the submit button. */
	async submit() {
		await this.submitButton.click();
	}

	/** Waits for the in-page success alert that appears after a reservation is created. */
	async waitForSuccess(timeout = 12_000) {
		await this.page
			.locator('[data-slot="alert-title"]')
			.filter({ hasText: "Reservation created successfully!" })
			.waitFor({ timeout });
	}

	/**
	 * Full happy-path flow: date → time → (name + phone for anonymous) → submit.
	 * Omit `name` / `phone` for authenticated users (fields are not rendered).
	 */
	async createReservation(opts: {
		daysFromNow?: number;
		timeSlot?: string;
		name?: string;
		phone?: string;
	} = {}) {
		const { daysFromNow = 7, timeSlot = "10:00 AM", name, phone } = opts;

		await this.selectDate(daysFromNow);
		await this.selectTime(timeSlot);

		if (name !== undefined) await this.fillName(name);
		if (phone !== undefined) await this.fillPhone(phone);

		await this.submit();
	}
}
