"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { ProductStatus } from "@/types/enum";
import { z } from "zod";

const schema = z.object({
	categoryName: z.string().trim().min(1),
	productName: z.string().trim().min(1),
	price: z.coerce.number().min(0),
});

export const wizardCreateFirstMenuAction = storeActionClient
	.metadata({ name: "wizardCreateFirstMenu" })
	.schema(schema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { categoryName, productName, price } = parsedInput;
		const now = getUtcNowEpoch();

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultCurrency: true },
		});
		if (!store) {
			throw new SafeError("Store not found");
		}

		const result = await sqlClient.$transaction(async (tx) => {
			const category = await tx.category.create({
				data: {
					storeId,
					name: categoryName,
					isFeatured: true,
					sortOrder: 1,
					createdAt: now,
					updatedAt: now,
				},
			});

			const product = await tx.product.create({
				data: {
					storeId,
					name: productName,
					description: "",
					price,
					currency: store.defaultCurrency,
					status: ProductStatus.Published,
					isFeatured: false,
					createdAt: now,
					updatedAt: now,
					ProductAttribute: {
						create: {
							isBrandNew: true,
							isShipRequired: false,
							isFreeShipping: false,
							stock: 0,
						},
					},
				},
			});

			await tx.productCategories.create({
				data: {
					productId: product.id,
					categoryId: category.id,
					sortOrder: 1,
				},
			});

			return { categoryId: category.id, productId: product.id };
		});

		return result;
	});
