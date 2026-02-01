"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteServiceStaffScheduleSchema } from "./service-staff-schedule.validation";

export const deleteServiceStaffScheduleAction = storeActionClient
	.metadata({ name: "deleteServiceStaffSchedule" })
	.schema(deleteServiceStaffScheduleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		// Verify schedule exists and belongs to this store
		const existingSchedule =
			await sqlClient.serviceStaffFacilitySchedule.findFirst({
				where: {
					id,
					storeId,
				},
				select: { id: true },
			});

		if (!existingSchedule) {
			throw new SafeError("Schedule not found");
		}

		await sqlClient.serviceStaffFacilitySchedule.delete({
			where: { id },
		});

		return { success: true, deletedId: id };
	});
