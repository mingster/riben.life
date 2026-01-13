"use server";

import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";
import { updateServiceStaffSchema } from "./update-service-staff.validation";
import BusinessHours from "@/lib/businessHours";

export const updateServiceStaffAction = storeActionClient
	.metadata({ name: "updateServiceStaff" })
	.schema(updateServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			memberRole,
			capacity,
			defaultCost,
			defaultCredit,
			defaultDuration,
			businessHours,
			description,
		} = parsedInput;

		const serviceStaff = await sqlClient.serviceStaff.findUnique({
			where: { id },
			select: { id: true, storeId: true, userId: true },
		});

		if (!serviceStaff || serviceStaff.storeId !== storeId) {
			throw new SafeError("Service staff not found");
		}

		// Get userId from existing record (foreign key, not editable)
		const userId = serviceStaff.userId;

		// Get store to get organizationId
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store || !store.organizationId) {
			throw new SafeError("Store organization not found");
		}

		// Validate businessHours JSON when provided
		if (businessHours && businessHours.trim().length > 0) {
			try {
				new BusinessHours(businessHours);
			} catch (error) {
				throw new SafeError(
					`Invalid businessHours: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}

		try {
			const updated = await sqlClient.serviceStaff.update({
				where: { id },
				data: {
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
					businessHours: businessHours || null,
					description: description || null,
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

			// Add memberRole to updated object for mapping
			const updatedWithRole = {
				...updated,
				memberRole: updatedMember.role,
			};

			return {
				serviceStaff: mapServiceStaffToColumn(updatedWithRole),
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
