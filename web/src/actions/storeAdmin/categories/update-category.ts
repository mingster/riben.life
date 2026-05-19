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
		const { id, name, sortOrder, isFeatured, locales = {} } = parsedInput;

		const category = await sqlClient.category.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!category || category.storeId !== storeId) {
			throw new SafeError("Category not found");
		}

		const localeEntries = Object.entries(locales).filter(
			([_, val]) => val.trim() !== "",
		);
		const emptyLocaleIds = Object.entries(locales)
			.filter(([_, val]) => val.trim() === "")
			.map(([localeId]) => localeId);

		const primaryName =
			name || (localeEntries.length > 0 ? localeEntries[0][1] : "Unnamed");

		const updatedCategory = await sqlClient.category.update({
			where: { id },
			data: {
				name: primaryName,
				sortOrder,
				isFeatured,
				locales: {
					deleteMany: { localeId: { in: emptyLocaleIds } },
					upsert: localeEntries.map(([localeId, val]) => ({
						where: { categoryId_localeId: { categoryId: id, localeId } },
						update: { name: val },
						create: { localeId, name: val },
					})),
				},
			},
			include: {
				ProductCategories: true,
				locales: true,
			},
		});

		return {
			category: mapCategoryToColumn(updatedCategory),
		};
	});
