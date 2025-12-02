"use server";

import { mapCategoryToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/categories/category-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { updateCategorySchema } from "./update-category.validation";

export const updateStoreCategoryAction = storeActionClient
	.metadata({ name: "updateCategory" })
	.schema(updateCategorySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id, name, sortOrder, isFeatured } = parsedInput;

		const category = await sqlClient.category.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!category || category.storeId !== storeId) {
			throw new SafeError("Category not found");
		}

		const updatedCategory = await sqlClient.category.update({
			where: { id },
			data: {
				name,
				sortOrder,
				isFeatured,
			},
			include: {
				ProductCategories: true,
			},
		});

		return {
			category: mapCategoryToColumn(updatedCategory),
		};
	});
