"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { createStoreProductsBulkSchema } from "./create-products-bulk.validation";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { mapProductToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/products/product-column";

export const createStoreProductsBulkAction = storeActionClient
	.metadata({ name: "createStoreProductsBulk" })
	.schema(createStoreProductsBulkSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, status, entries } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const createdProducts = [];

		for (const entry of entries) {
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

			if (entry.optionTemplateName) {
				const template = await sqlClient.storeProductOptionTemplate.findFirst({
					where: {
						storeId,
						optionName: entry.optionTemplateName,
					},
				});

				if (template) {
					const templateSelections =
						await sqlClient.storeProductOptionSelectionsTemplate.findMany({
							where: { optionId: template.id },
						});

					const productOption = await sqlClient.productOption.create({
						data: {
							productId: product.id,
							optionName: template.optionName,
							isRequired: template.isRequired,
							isMultiple: template.isMultiple,
							minSelection: template.minSelection,
							maxSelection: template.maxSelection,
							allowQuantity: template.allowQuantity,
							minQuantity: template.minQuantity,
							maxQuantity: template.maxQuantity,
							sortOrder: template.sortOrder,
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
			}

			const productWithRelations = await sqlClient.product.findUnique({
				where: { id: product.id },
				include: {
					ProductAttribute: true,
					ProductOptions: true,
				},
			});

			if (productWithRelations) {
				transformDecimalsToNumbers(productWithRelations);
				createdProducts.push(mapProductToColumn(productWithRelations));
			}
		}

		return {
			products: createdProducts,
		};
	});
