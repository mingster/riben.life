"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getT } from "@/app/i18n";

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
			const { t } = await getT();
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
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

		transformPrismaDataForJson(rsvpSettings);
		transformPrismaDataForJson(storeSettings);
		transformPrismaDataForJson(facilities);

		return {
			rsvpSettings,
			storeSettings,
			facilities,
		};
	});
