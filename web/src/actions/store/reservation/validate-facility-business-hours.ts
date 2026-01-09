import { SafeError } from "@/utils/error";
import logger from "@/lib/logger";
import { getOffsetHours, getDateInTz } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

interface BusinessHoursSchedule {
	Monday?: Array<{ from: string; to: string }> | "closed";
	Tuesday?: Array<{ from: string; to: string }> | "closed";
	Wednesday?: Array<{ from: string; to: string }> | "closed";
	Thursday?: Array<{ from: string; to: string }> | "closed";
	Friday?: Array<{ from: string; to: string }> | "closed";
	Saturday?: Array<{ from: string; to: string }> | "closed";
	Sunday?: Array<{ from: string; to: string }> | "closed";
}

/**
 * Validates that a reservation time falls within facility business hours
 * @param businessHours - JSON string containing facility business hours schedule
 * @param rsvpTimeUtc - UTC Date object representing the reservation time
 * @param storeTimezone - Store timezone string (e.g., "Asia/Taipei")
 * @param facilityId - Facility ID for logging purposes
 * @throws SafeError if time is outside business hours
 */
export async function validateFacilityBusinessHours(
	businessHours: string | null | undefined,
	rsvpTimeUtc: Date,
	storeTimezone: string,
	facilityId?: string,
): Promise<void> {
	// If no business hours, assume facility is always available
	if (!businessHours) {
		return;
	}

	try {
		const schedule = JSON.parse(businessHours) as BusinessHoursSchedule;

		// Convert UTC time to store timezone for checking
		const offsetHours = getOffsetHours(storeTimezone);
		const timeInStoreTz = getDateInTz(rsvpTimeUtc, offsetHours);

		// Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
		const dayOfWeek = timeInStoreTz.getDay();
		const dayNames = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		] as const;
		const dayName = dayNames[dayOfWeek];

		// Get hours for this day
		const dayHours = schedule[dayName];
		if (!dayHours || dayHours === "closed") {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_time_outside_business_hours_facility") ||
					"The selected time is outside business hours for this facility",
			);
		}

		// Check if time falls within any time range
		const checkHour = timeInStoreTz.getHours();
		const checkMinute = timeInStoreTz.getMinutes();
		const checkTimeMinutes = checkHour * 60 + checkMinute;

		let isWithinHours = false;
		for (const range of dayHours) {
			const [fromHour, fromMinute] = range.from.split(":").map(Number);
			const [toHour, toMinute] = range.to.split(":").map(Number);

			const fromMinutes = fromHour * 60 + fromMinute;
			const toMinutes = toHour * 60 + toMinute;

			// Check if time falls within range
			if (checkTimeMinutes >= fromMinutes && checkTimeMinutes < toMinutes) {
				isWithinHours = true;
				break;
			}

			// Handle range spanning midnight (e.g., 22:00 to 02:00)
			if (fromMinutes > toMinutes) {
				if (checkTimeMinutes >= fromMinutes || checkTimeMinutes < toMinutes) {
					isWithinHours = true;
					break;
				}
			}
		}

		if (!isWithinHours) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_time_outside_business_hours_facility") ||
					"The selected time is outside business hours for this facility",
			);
		}
	} catch (error) {
		// If parsing fails or validation fails, throw error
		if (error instanceof SafeError) {
			throw error;
		}
		// For JSON parse errors, allow the reservation (graceful degradation)
		// But log the error for debugging
		logger.warn("Failed to parse business hours for facility", {
			metadata: {
				facilityId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["rsvp", "business-hours", "validation"],
		});
	}
}
