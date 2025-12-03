"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { createStoreProductSchema } from "./create-product.validation";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { mapProductToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/products/product-column";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const createStoreProductAction = storeActionClient
	.metadata({ name: "createStoreProduct" })
	.schema(createStoreProductSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { name, description, price, currency, status, isFeatured } =
			parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const product = await sqlClient.product.create({
			data: {
				storeId,
				name,
				description,
				price,
				currency,
				status,
				isFeatured,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		const productWithRelations = await sqlClient.product.findUnique({
			where: { id: product.id },
			include: {
				ProductAttribute: true,
				ProductOptions: true,
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
