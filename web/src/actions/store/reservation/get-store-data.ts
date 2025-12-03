"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformDecimalsToNumbers } from "@/utils/utils";

const getStoreDataSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export const getStoreDataAction = baseClient
	.metadata({ name: "getStoreData" })
	.schema(getStoreDataSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Fetch all required data in parallel
		const [rsvpSettings, storeSettings, facilities] = await Promise.all([
			sqlClient.rsvpSettings.findFirst({
				where: { storeId },
			}),
			sqlClient.storeSettings.findFirst({
				where: { storeId },
			}),
			sqlClient.storeFacility.findMany({
				where: { storeId },
				orderBy: { facilityName: "asc" },
			}),
		]);

		transformDecimalsToNumbers(rsvpSettings);
		transformDecimalsToNumbers(storeSettings);
		transformDecimalsToNumbers(facilities);

		return {
			rsvpSettings,
			storeSettings,
			facilities,
		};
	});
