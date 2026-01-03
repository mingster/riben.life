"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteServiceStaffSchema } from "./delete-service-staff.validation";

export const deleteServiceStaffAction = storeActionClient
	.metadata({ name: "deleteServiceStaff" })
	.schema(deleteServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const serviceStaff = await sqlClient.serviceStaff.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!serviceStaff || serviceStaff.storeId !== storeId) {
			throw new SafeError("Service staff not found");
		}

		// Check if there are any related Rsvp records
		const relatedRsvpCount = await sqlClient.rsvp.count({
			where: {
				serviceStaffId: id,
			},
		});

		if (relatedRsvpCount > 0) {
			// Soft delete: mark as deleted
			await sqlClient.serviceStaff.update({
				where: { id },
				data: {
					isDeleted: true,
				},
			});
		} else {
			// Hard delete: no related data, safe to delete completely
			await sqlClient.serviceStaff.delete({
				where: { id },
			});
		}

		return { id };
	});
