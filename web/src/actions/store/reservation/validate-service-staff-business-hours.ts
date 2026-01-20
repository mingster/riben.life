import { SafeError } from "@/utils/error";
import logger from "@/lib/logger";
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
 * Validates that a reservation time falls within service staff business hours
 * @param businessHours - JSON string containing service staff business hours schedule
 * @param rsvpTimeUtc - UTC Date object representing the reservation time
 * @param storeTimezone - Store timezone string (e.g., "Asia/Taipei")
 * @param serviceStaffId - Service staff ID for logging purposes
 * @throws SafeError if time is outside business hours
 */
export async function validateServiceStaffBusinessHours(
	businessHours: string | null | undefined,
	rsvpTimeUtc: Date,
	storeTimezone: string,
	serviceStaffId?: string,
): Promise<void> {
	// If no business hours, assume service staff is always available
	if (!businessHours) {
		return;
	}

	try {
		const schedule = JSON.parse(businessHours) as BusinessHoursSchedule;

		// Use Intl.DateTimeFormat to get time components in store timezone (server independent)
		const formatter = new Intl.DateTimeFormat("en", {
			timeZone: storeTimezone,
			weekday: "long", // "Sunday", "Monday", etc.
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		const parts = formatter.formatToParts(rsvpTimeUtc);
		const getValue = (type: string): string => {
			const part = parts.find((p) => p.type === type);
			return part ? part.value : "";
		};

		// Get day of week (server independent)
		const weekday = getValue("weekday");
		const dayName = weekday as keyof BusinessHoursSchedule;

		// Get hours for this day
		const dayHours = schedule[dayName];
		if (!dayHours || dayHours === "closed") {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_time_outside_business_hours_service_staff") ||
					"The selected time is outside business hours for this service staff",
			);
		}

		// Get time components in store timezone (server independent)
		const checkHour = Number.parseInt(getValue("hour"), 10);
		const checkMinute = Number.parseInt(getValue("minute"), 10);
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
				t("rsvp_time_outside_business_hours_service_staff") ||
					"The selected time is outside business hours for this service staff",
			);
		}
	} catch (error) {
		// If parsing fails or validation fails, throw error
		if (error instanceof SafeError) {
			throw error;
		}
		// For JSON parse errors, allow the reservation (graceful degradation)
		// But log the error for debugging
		logger.warn("Failed to parse business hours for service staff", {
			metadata: {
				serviceStaffId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["rsvp", "business-hours", "validation", "service-staff"],
		});
	}
}
