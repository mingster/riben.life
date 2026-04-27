import { getT } from "@/app/i18n";
import { getServiceStaffBusinessHours } from "@/utils/service-staff-schedule-utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";
import { SafeError } from "@/utils/error";

/**
 * Validates that a reservation time falls within service staff business hours.
 *
 * @param storeId - Store ID
 * @param serviceStaffId - Service staff ID
 * @param facilityId - Facility ID (null if no specific facility)
 * @param rsvpTimeUtc - UTC Date object representing the reservation time
 * @param storeTimezone - Store timezone string (e.g., "Asia/Taipei")
 */
export async function validateServiceStaffBusinessHours(
	storeId: string,
	serviceStaffId: string,
	facilityId: string | null,
	rsvpTimeUtc: Date,
	storeTimezone: string,
): Promise<void> {
	const serviceStaffHours = await getServiceStaffBusinessHours(
		storeId,
		serviceStaffId,
		facilityId,
		rsvpTimeUtc,
	);
	const { isValid } = checkTimeAgainstBusinessHours(
		serviceStaffHours,
		rsvpTimeUtc,
		storeTimezone,
	);

	if (!isValid) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_time_outside_business_hours_service_staff") ||
				"The selected time is outside business hours for this service staff",
		);
	}
}
