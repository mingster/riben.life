"use server";

import { mapFacilityToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createFacilitiesSchema } from "./create-facilities.validation";

export const createFacilitiesAction = storeActionClient
	.metadata({ name: "createFacilities" })
	.schema(createFacilitiesSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			prefix,
			numOfFacilities,
			capacity,
			defaultCost,
			defaultCredit,
			defaultDuration,
			businessHours,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const operations = Array.from({ length: numOfFacilities }, (_, index) =>
			sqlClient.storeFacility.create({
				data: {
					storeId,
					facilityName: `${prefix}${index + 1}`, // e.g. "A1", "A2", "A3"
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
					businessHours: businessHours || null,
				},
			}),
		);

		try {
			const createdFacilities = await sqlClient.$transaction(operations);

			return {
				createdFacilities: createdFacilities.map(mapFacilityToColumn),
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
