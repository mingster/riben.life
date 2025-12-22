import { getUtcNow } from "./datetime-utils";

interface RsvpSettingsForTimeWindow {
	canReserveBefore?: number | null;
	canReserveAfter?: number | null;
}

/**
 * Checks if a reservation time falls within the allowed reservation window (client-side)
 * @param rsvpSettings - RsvpSettings object containing canReserveBefore and canReserveAfter
 * @param rsvpTime - Date object representing the reservation time (in UTC)
 * @returns true if within window, false otherwise
 */
export function isWithinReservationTimeWindow(
	rsvpSettings: RsvpSettingsForTimeWindow | null | undefined,
	rsvpTime: Date,
): boolean {
	// If settings are not available, allow all times (graceful degradation)
	if (!rsvpSettings) {
		return true;
	}

	const canReserveBefore = rsvpSettings.canReserveBefore ?? 2; // Default: 2 hours
	const canReserveAfter = rsvpSettings.canReserveAfter ?? 2190; // Default: 3 months (2190 hours)

	const now = getUtcNow();
	const hoursUntilReservation =
		(rsvpTime.getTime() - now.getTime()) / (1000 * 60 * 60);

	// Check minimum hours in advance (canReserveBefore)
	if (hoursUntilReservation < canReserveBefore) {
		return false;
	}

	// Check maximum hours in future (canReserveAfter)
	if (hoursUntilReservation > canReserveAfter) {
		return false;
	}

	return true;
}

/**
 * Gets a user-friendly error message for time window validation
 * @param rsvpSettings - RsvpSettings object containing canReserveBefore and canReserveAfter
 * @param rsvpTime - Date object representing the reservation time (in UTC)
 * @returns Error message string or null if time is valid
 */
export function getReservationTimeWindowError(
	rsvpSettings: RsvpSettingsForTimeWindow | null | undefined,
	rsvpTime: Date,
): string | null {
	if (!rsvpSettings) {
		return null;
	}

	const canReserveBefore = rsvpSettings.canReserveBefore ?? 2;
	const canReserveAfter = rsvpSettings.canReserveAfter ?? 2190;

	const now = getUtcNow();
	const hoursUntilReservation =
		(rsvpTime.getTime() - now.getTime()) / (1000 * 60 * 60);

	if (hoursUntilReservation < canReserveBefore) {
		return `Reservations must be made at least ${canReserveBefore} hours in advance. The selected time is too soon.`;
	}

	if (hoursUntilReservation > canReserveAfter) {
		const months = Math.round(canReserveAfter / 730);
		return `Reservations can only be made up to ${canReserveAfter} hours (approximately ${months} months) in advance. The selected time is too far in the future.`;
	}

	return null;
}
