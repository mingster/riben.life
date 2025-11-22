"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteCategorySchema } from "./delete-category.validation";

export const deleteStoreCategoryAction = storeActionClient
	.metadata({ name: "deleteCategory" })
	.schema(deleteCategorySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const category = await sqlClient.category.findUnique({
			where: { id },
			select: {
				id: true,
				storeId: true,
				ProductCategories: {
					select: { id: true },
					take: 1,
				},
			},
		});

		if (!category || category.storeId !== storeId) {
			throw new SafeError("Category not found");
		}

		if (category.ProductCategories.length > 0) {
			throw new SafeError("Category has products and cannot be deleted.");
		}

		await sqlClient.category.delete({
			where: { id },
		});

		return { id };
	});
