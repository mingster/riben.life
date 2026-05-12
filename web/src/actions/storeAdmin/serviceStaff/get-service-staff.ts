"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { getServiceStaffData } from "@/actions/store/reservation/get-service-staff-data";

const getServiceStaffSchema = z.object({
	/** When set, return only service staff that have a ServiceStaffFacilitySchedule for this facility (or default schedule with facilityId null) */
	facilityId: z.string().optional(),
	/** When set with facilityId, filter staff to those available at this time (ISO string). Staff with schedules must be within their ServiceStaffFacilitySchedule hours. */
	rsvpTimeIso: z.string().optional(),
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone: z.string().optional(),
	includeStaffIds: z.array(z.string()).optional(),
	/** Omit staff with capacity 0 unless listed in includeStaffIds (default false for CRUD/full lists). */
	excludeZeroCapacity: z.boolean().optional(),
});

export const getServiceStaffAction = storeActionClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			facilityId,
			rsvpTimeIso,
			storeTimezone,
			includeStaffIds,
			excludeZeroCapacity,
		} = parsedInput;

		const serviceStaff = await getServiceStaffData(storeId, {
			facilityId,
			rsvpTimeIso,
			storeTimezone,
			...(includeStaffIds?.length ? { includeStaffIds } : {}),
			...(excludeZeroCapacity ? { excludeZeroCapacity: true } : {}),
		});

		return { serviceStaff };
	});
