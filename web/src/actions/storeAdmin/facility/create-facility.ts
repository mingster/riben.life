"use server";

import { mapFacilityToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createFacilitySchema } from "./create-facility.validation";

export const createFacilityAction = storeActionClient
	.metadata({ name: "createFacility" })
	.schema(createFacilitySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			facilityName,
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

		try {
			const facility = await sqlClient.storeFacility.create({
				data: {
					storeId,
					facilityName,
					capacity,
					defaultCost,
					defaultCredit,
					defaultDuration,
					businessHours: businessHours || null,
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
