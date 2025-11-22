"use server";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteProductSchema } from "./delete-product.validation";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";

export const deleteProductAction = storeActionClient
	.metadata({ name: "deleteProduct" })
	.schema(deleteProductSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, productId } = parsedInput;

		const product = await sqlClient.product.findFirst({
			where: {
				id: productId,
				storeId,
			},
		});

		if (!product) {
			throw new SafeError("Product not found");
		}

		await sqlClient.$transaction(async (tx) => {
			const optionIds = await tx.productOption.findMany({
				where: { productId },
				select: { id: true },
			});

			if (optionIds.length > 0) {
				await tx.productOptionSelections.deleteMany({
					where: {
						optionId: {
							in: optionIds.map((option) => option.id),
						},
					},
				});
			}

			await tx.productOption.deleteMany({
				where: { productId },
			});

			await tx.productAttribute.deleteMany({
				where: { productId },
			});

			await tx.productCategories.deleteMany({
				where: { productId },
			});

			await tx.product.delete({
				where: { id: productId },
			});
		});

		return { deletedProductId: productId };
	});
