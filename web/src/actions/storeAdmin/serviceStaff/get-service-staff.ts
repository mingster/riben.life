"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { getServiceStaffData } from "@/lib/service-staff";

const getServiceStaffSchema = z.object({
	/** When set, return only service staff that have a ServiceStaffFacilitySchedule for this facility (or default schedule with facilityId null) */
	facilityId: z.string().optional(),
	/** When set with facilityId, filter staff to those available at this time (ISO string). Staff with schedules must be within their ServiceStaffFacilitySchedule hours. */
	rsvpTimeIso: z.string().optional(),
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone: z.string().optional(),
});

export const getServiceStaffAction = storeActionClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { facilityId, rsvpTimeIso, storeTimezone } = parsedInput;

		const serviceStaff = await getServiceStaffData(storeId, {
			facilityId,
			rsvpTimeIso,
			storeTimezone,
		});

		return { serviceStaff };
	});
