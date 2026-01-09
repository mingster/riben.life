import { SafeError } from "@/utils/error";
import { getUtcNow, epochToDate } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

interface RsvpSettingsForTimeWindow {
	canReserveBefore?: number | null;
	canReserveAfter?: number | null;
}

/**
 * Validates that a reservation time falls within the allowed reservation window
 * @param rsvpSettings - RsvpSettings object containing canReserveBefore and canReserveAfter
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

	const canReserveBefore = rsvpSettings.canReserveBefore ?? 2; // Default: 2 hours
	const canReserveAfter = rsvpSettings.canReserveAfter ?? 2190; // Default: 3 months (2190 hours)

	const now = getUtcNow();
	const rsvpTimeDate = epochToDate(rsvpTime);

	if (!rsvpTimeDate) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_invalid_reservation_time") || "Invalid reservation time",
		);
	}

	const hoursUntilReservation =
		(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

	// Check minimum hours in advance (canReserveBefore)
	if (hoursUntilReservation < canReserveBefore) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_reservations_must_be_made_hours_in_advance", {
				hours: canReserveBefore,
			}) ||
				`Reservations must be made at least ${canReserveBefore} hours in advance. The selected time is too soon.`,
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
