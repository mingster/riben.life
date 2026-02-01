"use server";

import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { getT } from "@/app/i18n";
import { getServiceStaffData } from "@/lib/service-staff";

const getServiceStaffSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	/** When set, return staff with schedules for facility/default and staff with NO schedules (use StoreSettings.businessHours) */
	facilityId: z.string().optional(),
	/** When set with facilityId, filter staff to those available at this time (ISO string). */
	rsvpTimeIso: z.string().optional(),
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone: z.string().optional(),
});

export const getServiceStaffAction = baseClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, facilityId, rsvpTimeIso, storeTimezone } = parsedInput;

		try {
			const serviceStaff = await getServiceStaffData(storeId, {
				facilityId,
				rsvpTimeIso,
				storeTimezone,
			});
			return { serviceStaff };
		} catch (err) {
			if (err instanceof SafeError && err.message === "Store not found") {
				const { t } = await getT();
				throw new SafeError(t("rsvp_store_not_found") || "Store not found");
			}
			throw err;
		}
	});
