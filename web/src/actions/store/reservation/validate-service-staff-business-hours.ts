/**
 * Validates that a reservation time falls within service staff business hours.
 * This check is currently disabled; reservations are not validated against staff schedules.
 *
 * @param _storeId - Store ID
 * @param _serviceStaffId - Service staff ID
 * @param _facilityId - Facility ID (null if no specific facility)
 * @param _rsvpTimeUtc - UTC Date object representing the reservation time
 * @param _storeTimezone - Store timezone string (e.g., "Asia/Taipei")
 */
export async function validateServiceStaffBusinessHours(
	_storeId: string,
	_serviceStaffId: string,
	_facilityId: string | null,
	_rsvpTimeUtc: Date,
	_storeTimezone: string,
): Promise<void> {
	// Business hours check disabled
}
