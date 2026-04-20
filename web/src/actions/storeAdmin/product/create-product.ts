"use server";

import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { allocateSlugFromNameIfNeeded } from "@/lib/product-slug";
import { mapProductToColumn } from "@/lib/store-admin/map-product-column";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { resolveSpecsJsonForWrite } from "./apply-product-specs-json";
import { attributeAvailableEndToPrisma } from "./attribute-available-end";
import { createStoreProductSchema } from "./create-product.validation";

export const createStoreProductAction = storeActionClient
	.metadata({ name: "createStoreProduct" })
	.schema(createStoreProductSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			name,
			description,
			careContent,
			price,
			currency,
			status,
			isFeatured,
			slug,
			compareAtPrice,
			specsJsonText,
			attributeLength,
			attributeHeight,
			attributeWidth,
			attributeMfgPartNumber,
			attributeWeight,
			attributeStock,
			attributeDisplayStockAvailability,
			attributeDisplayStockQuantity,
			attributeAllowBackOrder,
			attributeOrderMinQuantity,
			attributeOrderMaxQuantity,
			attributeDisableBuyButton,
			attributeIsBrandNew,
			attributeIsShipRequired,
			attributeIsFreeShipping,
			attributeAdditionalShipCost,
			attributeAvailableEndDate,
			attributeIsCreditTopUp,
			attributeIsRecurring,
			attributeInterval,
			attributeIntervalCount,
			attributeTrialPeriodDays,
			attributeStripePriceId,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		let specsJson: ReturnType<typeof resolveSpecsJsonForWrite>;
		try {
			specsJson = resolveSpecsJsonForWrite(specsJsonText);
		} catch (err: unknown) {
			if (err instanceof SafeError) {
				throw err;
			}
			throw new SafeError(err instanceof Error ? err.message : String(err));
		}

		const slugForDb = await allocateSlugFromNameIfNeeded(storeId, slug, name);

		const attributeData = {
			length: attributeLength,
			height: attributeHeight,
			width: attributeWidth,
			mfgPartNumber: attributeMfgPartNumber?.trim() || null,
			weight: attributeWeight,
			stock: attributeStock,
			displayStockAvailability: attributeDisplayStockAvailability,
			displayStockQuantity: attributeDisplayStockQuantity,
			allowBackOrder: attributeAllowBackOrder,
			orderMinQuantity: attributeOrderMinQuantity,
			orderMaxQuantity: attributeOrderMaxQuantity,
			disableBuyButton: attributeDisableBuyButton,
			isBrandNew: attributeIsBrandNew,
			isShipRequired: attributeIsShipRequired,
			isFreeShipping: attributeIsFreeShipping,
			additionalShipCost: attributeAdditionalShipCost,
			availableEndDate: attributeAvailableEndToPrisma(
				attributeAvailableEndDate,
			),
			isCreditTopUp: attributeIsCreditTopUp,
			isRecurring: attributeIsRecurring,
			interval: attributeInterval,
			intervalCount: attributeIntervalCount,
			trialPeriodDays: attributeTrialPeriodDays,
			stripePriceId: attributeStripePriceId?.trim() || null,
		};

		const product = await sqlClient.product.create({
			data: {
				storeId,
				name,
				description,
				careContent: careContent?.trim() || null,
				price,
				currency,
				status,
				isFeatured,
				slug: slugForDb,
				compareAtPrice: compareAtPrice ?? null,
				...(specsJson === undefined
					? {}
					: {
							specsJson: specsJson === null ? Prisma.DbNull : specsJson,
						}),
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
				ProductAttribute: {
					create: attributeData,
				},
			},
		});

		const productWithRelations = await sqlClient.product.findUnique({
			where: { id: product.id },
			include: {
				ProductAttribute: true,
				ProductOptions: {
					include: { ProductOptionSelections: { orderBy: { name: "asc" } } },
					orderBy: { sortOrder: "asc" },
				},
			},
		});

		if (!productWithRelations) {
			throw new SafeError("Failed to load created product");
		}

		transformPrismaDataForJson(productWithRelations);

		return {
			product: mapProductToColumn(productWithRelations),
		};
	});
