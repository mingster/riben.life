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
			select: { id: true, storeId: true, userId: true },
		});

		if (!serviceStaff || serviceStaff.storeId !== storeId) {
			throw new SafeError("Service staff not found");
		}

		// Get store to find organizationId
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { organizationId: true },
		});

		if (!store || !store.organizationId) {
			throw new SafeError("Store not found");
		}

		// Check if this user is an owner
		const member = await sqlClient.member.findFirst({
			where: {
				userId: serviceStaff.userId,
				organizationId: store.organizationId,
				role: "owner",
			},
		});

		// If this user is an owner, check if they are the last owner
		if (member) {
			const ownerCount = await sqlClient.member.count({
				where: {
					organizationId: store.organizationId,
					role: "owner",
				},
			});

			if (ownerCount <= 1) {
				throw new SafeError(
					"Cannot delete the last owner. Please assign another owner before deleting.",
				);
			}
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

			// Delete the user
		}

		return { id };
	});
