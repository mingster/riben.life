"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import BusinessHours from "@/lib/businessHours";
import { Prisma } from "@prisma/client";

import { updateServiceStaffScheduleSchema } from "./service-staff-schedule.validation";

export const updateServiceStaffScheduleAction = storeActionClient
	.metadata({ name: "updateServiceStaffSchedule" })
	.schema(updateServiceStaffScheduleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			facilityId,
			businessHours,
			effectiveFrom,
			effectiveTo,
			isActive,
			priority,
		} = parsedInput;

		// Verify schedule exists and belongs to this store
		const existingSchedule =
			await sqlClient.serviceStaffFacilitySchedule.findFirst({
				where: {
					id,
					storeId,
				},
				select: { id: true, serviceStaffId: true },
			});

		if (!existingSchedule) {
			throw new SafeError("Schedule not found");
		}

		// If facilityId is provided, verify it exists and belongs to this store
		if (facilityId) {
			const facility = await sqlClient.storeFacility.findFirst({
				where: {
					id: facilityId,
					storeId,
				},
				select: { id: true },
			});

			if (!facility) {
				throw new SafeError("Facility not found");
			}
		}

		// Validate businessHours JSON
		try {
			new BusinessHours(businessHours);
		} catch (error) {
			throw new SafeError(
				`Invalid businessHours: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}

		try {
			const schedule = await sqlClient.serviceStaffFacilitySchedule.update({
				where: { id },
				data: {
					facilityId: facilityId || null,
					businessHours,
					effectiveFrom: effectiveFrom ? BigInt(effectiveFrom) : null,
					effectiveTo: effectiveTo ? BigInt(effectiveTo) : null,
					isActive,
					priority,
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Facility: {
						select: {
							id: true,
							facilityName: true,
						},
					},
				},
			});

			return { schedule };
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError(
					facilityId
						? "A schedule already exists for this service staff and facility combination."
						: "A default schedule already exists for this service staff.",
				);
			}

			throw error;
		}
	});
