import { SafeError } from "@/utils/error";
import { getUtcNow, epochToDate } from "@/utils/datetime-utils";

interface RsvpSettingsForValidation {
	canCancel?: boolean | null;
	cancelHours?: number | null;
}

/**
 * Validates that a reservation modification or cancellation occurs within the allowed cancellation window
 * @param rsvpSettings - RsvpSettings object containing canCancel and cancelHours
 * @param rsvpTime - BigInt epoch time (milliseconds) representing the reservation time
 * @param action - Action being performed ("modify" or "cancel") for error message customization
 * @throws SafeError if action occurs outside the cancellation window
 */
export function validateCancelHoursWindow(
	rsvpSettings: RsvpSettingsForValidation | null | undefined,
	rsvpTime: bigint,
	action: "modify" | "cancel" = "modify",
): void {
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
		const actionText = action === "cancel" ? "cancelled" : "modified";
		throw new SafeError(
			`Reservation can only be ${actionText} more than ${cancelHours} hours before the reservation time`,
		);
	}
}
