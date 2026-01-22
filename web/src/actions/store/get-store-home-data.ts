"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import getStoreWithProducts from "@/actions/get-store-with-products";
import logger from "@/lib/logger";
import type { StoreWithProducts, RsvpSettings } from "@/types";
import type { StoreSettings } from "@prisma/client";

const getStoreHomeDataSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export const getStoreHomeDataAction = baseClient
	.metadata({ name: "getStoreHomeData" })
	.schema(getStoreHomeDataSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		// Fetch store with products (supports both UUID and name lookup)
		const store = await getStoreWithProducts(storeId);

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Use the actual store ID for subsequent queries (in case we found by name)
		const actualStoreId = store.id;

		// Fetch RSVP settings, store settings, and facilities in parallel
		// Both settings should always exist (created at store creation time)
		const [rsvpSettings, storeSettings, facilities] = await Promise.all([
			sqlClient.rsvpSettings.findUnique({
				where: { storeId: actualStoreId },
			}),
			sqlClient.storeSettings.findUnique({
				where: { storeId: actualStoreId },
			}),
			sqlClient.storeFacility.findMany({
				where: { storeId: actualStoreId },
				orderBy: { facilityName: "asc" },
			}),
		]);

		// StoreSettings should never be null (created at store creation)
		// If it's missing, it's a data integrity issue
		if (!storeSettings) {
			logger.error("StoreSettings not found for store", {
				metadata: { storeId: actualStoreId },
				tags: ["store", "storeSettings", "error"],
			});
			throw new SafeError("Store settings not found");
		}

		// RsvpSettings should never be null (created at store creation)
		// If it's missing, it's a data integrity issue
		if (!rsvpSettings) {
			logger.error("RsvpSettings not found for store", {
				metadata: { storeId: actualStoreId },
				tags: ["store", "rsvpSettings", "error"],
			});
			throw new SafeError("RSVP settings not found");
		}

		// Transform BigInt (epoch timestamps) and Decimal for JSON serialization
		transformPrismaDataForJson(store);
		transformPrismaDataForJson(rsvpSettings);
		transformPrismaDataForJson(storeSettings);
		transformPrismaDataForJson(facilities);

		return {
			store: store as StoreWithProducts,
			rsvpSettings: rsvpSettings as RsvpSettings,
			storeSettings: storeSettings as StoreSettings,
			facilities,
		};
	});
