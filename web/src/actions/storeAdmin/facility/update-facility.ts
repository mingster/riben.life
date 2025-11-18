"use server";

import { mapFacilityToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateFacilitySchema } from "./update-facility.validation";

export const updateFacilityAction = storeOwnerActionClient
	.metadata({ name: "updateFacility" })
	.schema(updateFacilitySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id, facilityName, capacity } = parsedInput;

		const facility = await sqlClient.storeFacility.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!facility || facility.storeId !== storeId) {
			throw new SafeError("Facility not found");
		}

		try {
			const updated = await sqlClient.storeFacility.update({
				where: { id },
				data: {
					facilityName,
					capacity,
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
