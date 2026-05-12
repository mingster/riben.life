"use server";

import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { getServiceStaffBusinessHours } from "@/lib/service-staff/schedule-utils";

const getServiceStaffFacilityBusinessHoursSchema = z.object({
	storeId: z.string().min(1),
	serviceStaffId: z.string().min(1),
	facilityId: z.string().min(1),
	/** Calendar date for schedule validity (effectiveFrom / effectiveTo); ISO string */
	dateIso: z.string().min(1),
});

/**
 * Public action: effective business hours JSON for a service staff member at a facility on a given date.
 * Used by the storefront reservation flow to disable unavailable time slots in personnel mode.
 */
export const getServiceStaffFacilityBusinessHoursAction = baseClient
	.metadata({ name: "getServiceStaffFacilityBusinessHours" })
	.schema(getServiceStaffFacilityBusinessHoursSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, serviceStaffId, facilityId, dateIso } = parsedInput;
		const date = new Date(dateIso);
		const businessHoursJson = await getServiceStaffBusinessHours(
			storeId,
			serviceStaffId,
			facilityId,
			date,
		);
		return { businessHoursJson };
	});
