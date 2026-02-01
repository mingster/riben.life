"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { getServiceStaffSchedulesSchema } from "./service-staff-schedule.validation";

export const getServiceStaffSchedulesAction = storeActionClient
	.metadata({ name: "getServiceStaffSchedules" })
	.schema(getServiceStaffSchedulesSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { serviceStaffId } = parsedInput;

		// Verify service staff exists and belongs to this store
		const serviceStaff = await sqlClient.serviceStaff.findFirst({
			where: {
				id: serviceStaffId,
				storeId,
				isDeleted: false,
			},
			select: { id: true },
		});

		if (!serviceStaff) {
			throw new SafeError("Service staff not found");
		}

		const schedules = await sqlClient.serviceStaffFacilitySchedule.findMany({
			where: {
				storeId,
				serviceStaffId,
			},
			include: {
				Facility: {
					select: {
						id: true,
						facilityName: true,
					},
				},
			},
			orderBy: [{ facilityId: "asc" }, { priority: "desc" }],
		});

		return { schedules };
	});
