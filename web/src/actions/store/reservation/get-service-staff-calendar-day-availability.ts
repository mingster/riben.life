"use server";

import { getServiceStaffBusinessHours } from "@/lib/service-staff/schedule-utils";
import {
	checkTimeAgainstBusinessHours,
	utcInstantForStoreCalendarWallClock,
} from "@/lib/reservation/utils";
import { baseClient } from "@/utils/actions/safe-action";
import { getServiceStaffCalendarDayAvailabilitySchema } from "./get-service-staff-calendar-day-availability.validation";

const PROBE_HOURS = [10, 14, 18] as const;

/**
 * For each calendar day key, returns whether the service staff has any open window
 * (same 10:00 / 14:00 / 18:00 probes as the facility calendar) at the facility.
 */
export const getServiceStaffCalendarDayAvailabilityAction = baseClient
	.metadata({ name: "getServiceStaffCalendarDayAvailability" })
	.schema(getServiceStaffCalendarDayAvailabilitySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, serviceStaffId, facilityId, storeTimezone, dayKeys } =
			parsedInput;

		const dayAvailability: Record<string, boolean> = {};

		for (const dayKey of dayKeys) {
			const anchorDate = utcInstantForStoreCalendarWallClock(
				dayKey,
				12,
				0,
				storeTimezone,
			);
			const hoursJson = await getServiceStaffBusinessHours(
				storeId,
				serviceStaffId,
				facilityId,
				anchorDate,
			);

			if (!hoursJson) {
				dayAvailability[dayKey] = true;
				continue;
			}

			const isOpen = PROBE_HOURS.some((h) => {
				const probe = utcInstantForStoreCalendarWallClock(
					dayKey,
					h,
					0,
					storeTimezone,
				);
				return checkTimeAgainstBusinessHours(hoursJson, probe, storeTimezone)
					.isValid;
			});

			dayAvailability[dayKey] = isOpen;
		}

		return { dayAvailability };
	});
