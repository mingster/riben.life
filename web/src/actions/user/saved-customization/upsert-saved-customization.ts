"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { upsertSavedCustomizationSchema } from "./saved-customization.validation";

/** Max approximate JSON payload size for customization (bytes) — guards huge base64 photos. */
const MAX_CUSTOMIZATION_JSON_BYTES = 4_500_000;

export const upsertSavedCustomizationAction = userRequiredActionClient
	.metadata({ name: "upsertSavedCustomization" })
	.schema(upsertSavedCustomizationSchema)
	.action(async ({ ctx: { userId }, parsedInput }) => {
		const {
			productId,
			customization,
			productName: nameFromClient,
		} = parsedInput;

		const jsonStr = JSON.stringify(customization);
		if (jsonStr.length > MAX_CUSTOMIZATION_JSON_BYTES) {
			logger.warn("Saved customization payload too large", {
				metadata: { userId, productId, bytes: jsonStr.length },
				tags: ["saved-customization", "validation"],
			});
			throw new Error(
				"Customization is too large to save. Try a smaller front photo.",
			);
		}

		const product = await sqlClient.product.findFirst({
			where: { id: productId, status: 1 },
			select: { id: true, name: true },
		});

		if (!product) {
			throw new Error("Product not found or unavailable.");
		}

		const productName = nameFromClient?.trim() || product.name;
		const now = getUtcNowEpoch();

		const row = await sqlClient.savedProductCustomization.upsert({
			where: {
				userId_productId: { userId, productId },
			},
			create: {
				userId,
				productId,
				productName,
				customization,
				createdAt: now,
				updatedAt: now,
			},
			update: {
				productName,
				customization,
				updatedAt: now,
			},
		});

		return { id: row.id, productId: row.productId, updatedAt: row.updatedAt };
	});
