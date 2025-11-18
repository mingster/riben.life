"use server";

import { mapFacilityToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createFacilitySchema } from "./create-facility.validation";

export const createFacilityAction = storeOwnerActionClient
	.metadata({ name: "createFacility" })
	.schema(createFacilitySchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			facilityName,
			capacity,
			defaultCost,
			defaultCredit,
			defaultDuration,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		try {
			const facility = await sqlClient.storeFacility.create({
				data: {
					storeId,
					facilityName,
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
				},
			});

			return {
				facility: mapFacilityToColumn(facility),
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
