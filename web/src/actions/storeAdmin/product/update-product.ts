"use server";

import { storeActionClient } from "@/utils/actions/safe-action";
import { updateProductSchema } from "./update-product.validation";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { mapProductToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/products/product-column";
import { transformDecimalsToNumbers } from "@/utils/utils";

export const updateProductAction = storeActionClient
	.metadata({ name: "updateProduct" })
	.schema(updateProductSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			name,
			description,
			price,
			currency,
			status,
			isFeatured,
		} = parsedInput;

		const product = await sqlClient.product.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!product || product.storeId !== storeId) {
			throw new SafeError("Product not found");
		}

		const updated = await sqlClient.product.update({
			where: { id },
			data: {
				name,
				description,
				price,
				currency,
				status,
				isFeatured,
			},
		});

		const productWithRelations = await sqlClient.product.findUnique({
			where: { id: updated.id },
			include: {
				ProductAttribute: true,
				ProductOptions: true,
			},
		});

		if (!productWithRelations) {
			throw new SafeError("Failed to load updated product");
		}

		transformDecimalsToNumbers(productWithRelations);

		return {
			product: mapProductToColumn(productWithRelations),
		};
	});
