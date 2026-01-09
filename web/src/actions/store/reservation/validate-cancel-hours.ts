import { SafeError } from "@/utils/error";
import { getUtcNow, epochToDate } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

interface RsvpSettingsForValidation {
	canCancel?: boolean | null;
	cancelHours?: number | null;
}

/**
 * Checks if cancellation is within the cancelHours window (for refund determination)
 * @param rsvpSettings - RsvpSettings object containing canCancel and cancelHours
 * @param rsvpTime - BigInt epoch time (milliseconds) representing the reservation time
 * @returns true if cancellation is within cancelHours window (no refund), false if outside window (refund allowed)
 */
export function isCancellationWithinCancelHours(
	rsvpSettings: RsvpSettingsForValidation | null | undefined,
	rsvpTime: bigint,
): boolean {
	// If canCancel is not enabled or cancelHours is not set, default to allowing refund
	if (!rsvpSettings?.canCancel || !rsvpSettings.cancelHours) {
		return false; // No restriction, so refund allowed
	}

	const cancelHours = rsvpSettings.cancelHours;
	const now = getUtcNow();
	const rsvpTimeDate = epochToDate(rsvpTime);

	if (!rsvpTimeDate) {
		// If we can't parse the time, default to allowing refund
		return false;
	}

	const hoursUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

	// If hoursUntilReservation < cancelHours, cancellation is within the policy window (no refund)
	// If hoursUntilReservation >= cancelHours, cancellation is outside the policy window (refund allowed)
	return hoursUntilReservation < cancelHours;
}

/**
 * Validates that a reservation modification occurs within the allowed cancellation window
 * @param rsvpSettings - RsvpSettings object containing canCancel and cancelHours
 * @param rsvpTime - BigInt epoch time (milliseconds) representing the reservation time
 * @param action - Action being performed ("modify") for error message customization
 * @throws SafeError if action occurs outside the cancellation window
 * @deprecated For cancellation, use isCancellationWithinCancelHours instead. This is kept for modify validation.
 */
export async function validateCancelHoursWindow(
	rsvpSettings: RsvpSettingsForValidation | null | undefined,
	rsvpTime: bigint,
	action: "modify" = "modify",
): Promise<void> {
	// Only validate if canCancel is enabled and cancelHours is set
	if (!rsvpSettings?.canCancel || !rsvpSettings.cancelHours) {
		return;
	}

	const cancelHours = rsvpSettings.cancelHours;
	const now = getUtcNow();
	const rsvpTimeDate = epochToDate(rsvpTime);

	if (!rsvpTimeDate) {
		// If we can't parse the time, skip validation (shouldn't happen, but graceful degradation)
		return;
	}

	const hoursUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

	if (hoursUntilReservation < cancelHours) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_reservation_can_only_be_modified_hours_before", {
				hours: cancelHours,
			}) ||
			`Reservation can only be modified more than ${cancelHours} hours before the reservation time`,
		);
	}
}
