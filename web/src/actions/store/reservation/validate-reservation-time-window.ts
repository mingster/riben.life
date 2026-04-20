import { SafeError } from "@/utils/error";
import { getUtcNow, epochToDate } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

interface RsvpSettingsForTimeWindow {
	/** Minimum advance notice before the reservation slot, in minutes. */
	canReserveBefore?: number | null;
	/** Maximum horizon for booking, in hours. */
	canReserveAfter?: number | null;
}

/**
 * Validates that a reservation time falls within the allowed reservation window
 * @param rsvpSettings - RsvpSettings object; canReserveBefore is in minutes, canReserveAfter in hours
 * @param rsvpTime - BigInt epoch time (milliseconds) representing the reservation time
 * @throws SafeError if reservation time is outside the allowed window
 */
export async function validateReservationTimeWindow(
	rsvpSettings: RsvpSettingsForTimeWindow | null | undefined,
	rsvpTime: bigint,
): Promise<void> {
	// If settings are not available, skip validation (graceful degradation)
	if (!rsvpSettings) {
		return;
	}

	const canReserveBefore = rsvpSettings.canReserveBefore ?? 120; // Default: 120 minutes (2 hours)
	const canReserveAfter = rsvpSettings.canReserveAfter ?? 2190; // Default: 3 months (2190 hours)

	const now = getUtcNow();
	const rsvpTimeDate = epochToDate(rsvpTime);

	if (!rsvpTimeDate) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_invalid_reservation_time") || "Invalid reservation time",
		);
	}

	const minutesUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60);
	const hoursUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

	// Minimum advance booking lead time (canReserveBefore, minutes)
	if (minutesUntilReservation < canReserveBefore) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_reservations_must_be_made_minutes_in_advance", {
				minutes: canReserveBefore,
			}) ||
				`Reservations must be made at least ${canReserveBefore} minutes in advance. The selected time is too soon.`,
		);
	}

	// Check maximum hours in future (canReserveAfter)
	if (hoursUntilReservation > canReserveAfter) {
		const months = Math.round(canReserveAfter / 730);
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_reservations_can_only_be_made_hours_in_advance", {
				hours: canReserveAfter,
				months,
			}) ||
				`Reservations can only be made up to ${canReserveAfter} hours (approximately ${months} months) in advance. The selected time is too far in the future.`,
		);
	}
}
