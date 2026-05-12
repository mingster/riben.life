import { epochToDate, getUtcNow } from "@/utils/datetime-utils";

interface RsvpSettingsForValidation {
	canCancel?: boolean | null;
	cancelHours?: number | null;
}

/** True when cancellation falls inside the no-refund window before the reservation. */
export function isCancellationWithinCancelHours(
	rsvpSettings: RsvpSettingsForValidation | null | undefined,
	rsvpTime: bigint,
): boolean {
	if (
		!rsvpSettings?.canCancel ||
		rsvpSettings.cancelHours == null ||
		rsvpSettings.cancelHours === 0
	) {
		return false;
	}

	const cancelHours = rsvpSettings.cancelHours;
	const now = getUtcNow();
	const rsvpTimeDate = epochToDate(rsvpTime);

	if (!rsvpTimeDate) {
		return false;
	}

	const hoursUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

	return hoursUntilReservation < cancelHours;
}
