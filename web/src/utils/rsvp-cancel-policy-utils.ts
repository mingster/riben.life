import { getUtcNow } from "@/utils/datetime-utils";
import { dateToEpoch } from "@/utils/datetime-utils";
import { isCancellationWithinCancelHours } from "@/actions/store/reservation/validate-cancel-hours";

interface RsvpSettingsForCancelPolicy {
	canCancel?: boolean | null;
	cancelHours?: number | null;
}

export interface CancelPolicyInfo {
	canCancel: boolean;
	cancelHours: number;
	isWithinCancelHours: boolean;
	hoursUntilReservation: number;
	wouldRefund: boolean;
}

/**
 * Calculates cancel policy information for a reservation
 * @param rsvpSettings - RsvpSettings object containing canCancel and cancelHours
 * @param rsvpTime - Date object representing the reservation time (in UTC)
 * @param alreadyPaid - Whether the reservation has already been paid
 * @returns CancelPolicyInfo object or null if cancellation is not enabled or rsvpTime is invalid
 */
export function calculateCancelPolicyInfo(
	rsvpSettings: RsvpSettingsForCancelPolicy | null | undefined,
	rsvpTime: Date | null | undefined,
	alreadyPaid: boolean = false,
): CancelPolicyInfo | null {
	// Return null if cancellation is not enabled or settings are missing
	if (
		!rsvpSettings?.canCancel ||
		!rsvpSettings.cancelHours ||
		!rsvpTime ||
		!(rsvpTime instanceof Date) ||
		isNaN(rsvpTime.getTime())
	) {
		return null;
	}

	// Convert Date to epoch for validation function
	const rsvpTimeEpoch = dateToEpoch(rsvpTime);
	if (!rsvpTimeEpoch) {
		return null;
	}

	// Check if cancellation is within the cancelHours window
	const isWithinCancelHours = isCancellationWithinCancelHours(
		{
			canCancel: rsvpSettings.canCancel,
			cancelHours: rsvpSettings.cancelHours,
		},
		rsvpTimeEpoch,
	);

	// Calculate hours until reservation
	const hoursUntilReservation =
		(rsvpTime.getTime() - getUtcNow().getTime()) / (1000 * 60 * 60);

	return {
		canCancel: rsvpSettings.canCancel,
		cancelHours: rsvpSettings.cancelHours,
		isWithinCancelHours,
		hoursUntilReservation,
		wouldRefund: alreadyPaid && !isWithinCancelHours,
	};
}
