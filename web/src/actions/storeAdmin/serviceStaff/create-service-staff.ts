"use server";

import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";

import { createServiceStaffSchema } from "./create-service-staff.validation";

export const createServiceStaffAction = storeActionClient
	.metadata({ name: "createServiceStaff" })
	.schema(createServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			userId,
			memberRole,
			capacity,
			defaultCost,
			defaultCredit,
			defaultDuration,
			description,
			receiveStoreNotifications,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		if (!store.organizationId) {
			throw new SafeError("Store organization not found");
		}

		// Verify user exists
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new SafeError("User not found");
		}

		// Check if user is already assigned as service staff for this store
		const existingServiceStaff = await sqlClient.serviceStaff.findFirst({
			where: {
				storeId,
				userId,
				isDeleted: false,
			},
			select: { id: true },
		});

		if (existingServiceStaff) {
			throw new SafeError(
				"This user is already assigned as service staff for this store.",
			);
		}

		// Note: businessHours are now managed via ServiceStaffFacilitySchedule model

		try {
			const serviceStaff = await sqlClient.serviceStaff.create({
				data: {
					storeId,
					userId,
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
					description: description || null,
					receiveStoreNotifications,
				},
				include: {
					User: {
						select: {
							id: true,
							name: true,
							email: true,
							phoneNumber: true,
						},
					},
				},
			});

			// Update or create member role
			const existingMember = await sqlClient.member.findFirst({
				where: {
					userId,
					organizationId: store.organizationId,
				},
			});

			let updatedMember;
			if (existingMember) {
				// Update existing member
				updatedMember = await sqlClient.member.update({
					where: { id: existingMember.id },
					data: { role: memberRole },
					select: { role: true },
				});
			} else {
				// Create new member
				updatedMember = await sqlClient.member.create({
					data: {
						id: crypto.randomUUID(),
						userId,
						organizationId: store.organizationId,
						role: memberRole,
						createdAt: getUtcNow(),
					},
					select: { role: true },
				});
			}

			// Add memberRole to serviceStaff object for mapping
			const serviceStaffWithRole = {
				...serviceStaff,
				memberRole: updatedMember.role,
			};

			return {
				serviceStaff: mapServiceStaffToColumn(serviceStaffWithRole),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError(
					"This user is already assigned as service staff for this store.",
				);
			}

			throw error;
		}
	});
