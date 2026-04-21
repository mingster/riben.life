"use server";

import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { allocateUniqueProductSlug } from "@/lib/product-slug";
import { mapProductToColumn } from "@/lib/store-admin/map-product-column";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { resolveSpecsJsonForWrite } from "./apply-product-specs-json";
import { attributeAvailableEndToPrisma } from "./attribute-available-end";
import { replaceProductRelatedForSource } from "./replace-product-related";
import { updateProductSchema } from "./update-product.validation";

export const updateProductAction = storeActionClient
	.metadata({ name: "updateProduct" })
	.schema(updateProductSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
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
			relatedProductIdsText,
		} = parsedInput;

		const product = await sqlClient.product.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!product || product.storeId !== storeId) {
			throw new SafeError("Product not found");
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

		const nextSlug =
			slug.trim() === ""
				? null
				: await allocateUniqueProductSlug(storeId, slug, id);

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

		await sqlClient.$transaction(async (tx) => {
			await tx.product.update({
				where: { id },
				data: {
					name,
					description,
					careContent: careContent?.trim() || null,
					price,
					currency,
					status,
					isFeatured,
					slug: nextSlug,
					compareAtPrice: compareAtPrice ?? null,
					...(specsJson === undefined
						? {}
						: {
								specsJson: specsJson === null ? Prisma.DbNull : specsJson,
							}),
					updatedAt: getUtcNowEpoch(),
				},
			});

			await tx.productAttribute.upsert({
				where: { productId: id },
				create: {
					productId: id,
					...attributeData,
				},
				update: attributeData,
			});

			await replaceProductRelatedForSource(tx, {
				storeId,
				sourceProductId: id,
				rawIdsText: relatedProductIdsText,
			});
		});

		const productWithRelations = await sqlClient.product.findUnique({
			where: { id },
			include: {
				ProductAttribute: true,
				ProductOptions: {
					include: { ProductOptionSelections: { orderBy: { name: "asc" } } },
					orderBy: { sortOrder: "asc" },
				},
			},
		});

		if (!productWithRelations) {
			throw new SafeError("Failed to load updated product");
		}

		transformPrismaDataForJson(productWithRelations);

		return {
			product: mapProductToColumn(productWithRelations),
		};
	});
