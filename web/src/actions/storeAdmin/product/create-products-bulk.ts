"use server";

import { sqlClient } from "@/lib/prismadb";
import { mapProductToColumn } from "@/lib/store-admin/map-product-column";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { createStoreProductsBulkSchema } from "./create-products-bulk.validation";

export const createStoreProductsBulkAction = storeActionClient
	.metadata({ name: "createStoreProductsBulk" })
	.schema(createStoreProductsBulkSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { status, entries } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const createdProducts = [];

		for (const entry of entries) {
			const templateName = entry.optionTemplateName?.trim();
			const optionTemplate = templateName
				? await sqlClient.storeProductOptionTemplate.findFirst({
						where: {
							storeId,
							optionName: templateName,
						},
					})
				: null;

			const product = await sqlClient.product.create({
				data: {
					storeId,
					name: entry.name,
					description: entry.description ?? "",
					price:
						entry.price !== undefined && !Number.isNaN(entry.price)
							? entry.price
							: 0,
					status,
					useOption: Boolean(optionTemplate),
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});

			if (entry.categoryName) {
				const category = await sqlClient.category.findFirst({
					where: {
						name: entry.categoryName,
						storeId,
					},
					select: { id: true },
				});

				if (category) {
					await sqlClient.productCategories.create({
						data: {
							productId: product.id,
							categoryId: category.id,
							sortOrder: 1,
						},
					});
				}
			}

			if (optionTemplate) {
				const templateSelections =
					await sqlClient.storeProductOptionSelectionsTemplate.findMany({
						where: { optionId: optionTemplate.id },
					});

				const productOption = await sqlClient.productOption.create({
					data: {
						productId: product.id,
						optionName: optionTemplate.optionName,
						isRequired: optionTemplate.isRequired,
						isMultiple: optionTemplate.isMultiple,
						minSelection: optionTemplate.minSelection,
						maxSelection: optionTemplate.maxSelection,
						allowQuantity: optionTemplate.allowQuantity,
						minQuantity: optionTemplate.minQuantity,
						maxQuantity: optionTemplate.maxQuantity,
						sortOrder: optionTemplate.sortOrder,
					},
				});

				if (templateSelections.length > 0) {
					await sqlClient.productOptionSelections.createMany({
						data: templateSelections.map((selection) => ({
							optionId: productOption.id,
							name: selection.name,
							price: selection.price,
							isDefault: selection.isDefault,
						})),
					});
				}
			}

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

			if (productWithRelations) {
				transformPrismaDataForJson(productWithRelations);
				createdProducts.push(mapProductToColumn(productWithRelations));
			}
		}

		return {
			products: createdProducts,
		};
	});
