"use server";

import { mapFacilityToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateFacilitySchema } from "./update-facility.validation";
import BusinessHours from "@/lib/businessHours";

export const updateFacilityAction = storeActionClient
	.metadata({ name: "updateFacility" })
	.schema(updateFacilitySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			facilityName,
			capacity,
			defaultCost,
			defaultCredit,
			defaultDuration,
			businessHours,
			description,
			location,
			travelInfo,
		} = parsedInput;

		const facility = await sqlClient.storeFacility.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!facility || facility.storeId !== storeId) {
			throw new SafeError("Facility not found");
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
			const updated = await sqlClient.storeFacility.update({
				where: { id },
				data: {
					facilityName,
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
					businessHours: businessHours || null,
					description: description || null,
					location: location || null,
					travelInfo: travelInfo || null,
				},
			});

			return {
				facility: mapFacilityToColumn(updated),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Facility name already exists.");
			}

			throw error;
		}
	});
