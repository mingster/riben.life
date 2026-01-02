"use server";

import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";

import { createServiceStaffSchema } from "./create-service-staff.validation";
import BusinessHours from "@/lib/businessHours";

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
			businessHours,
			description,
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
			const serviceStaff = await sqlClient.serviceStaff.create({
				data: {
					storeId,
					userId,
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

			if (existingMember) {
				// Update existing member
				await sqlClient.member.update({
					where: { id: existingMember.id },
					data: { role: memberRole },
				});
			} else {
				// Create new member
				await sqlClient.member.create({
					data: {
						id: crypto.randomUUID(),
						userId,
						organizationId: store.organizationId,
						role: memberRole,
						createdAt: getUtcNow(),
					},
				});
			}

			return {
				serviceStaff: mapServiceStaffToColumn(serviceStaff),
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
