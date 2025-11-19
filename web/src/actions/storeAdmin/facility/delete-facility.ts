"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";

import { deleteFacilitySchema } from "./delete-facility.validation";

export const deleteFacilityAction = storeOwnerActionClient
	.metadata({ name: "deleteFacility" })
	.schema(deleteFacilitySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const facility = await sqlClient.storeFacility.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!facility || facility.storeId !== storeId) {
			throw new SafeError("Facility not found");
		}

		await sqlClient.storeFacility.delete({
			where: { id },
		});

		return { id };
	});
