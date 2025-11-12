"use server";

import { mapCategoryToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/categories/category-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";

import { createCategorySchema } from "./create-category.validation";

export const createStoreCategoryAction = storeOwnerActionClient
	.metadata({ name: "createCategory" })
	.schema(createCategorySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, name, sortOrder, isFeatured } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		let nextSortOrder = sortOrder;
		if (nextSortOrder === undefined) {
			const lastCategory = await sqlClient.category.findFirst({
				where: { storeId },
				orderBy: { sortOrder: "desc" },
				select: { sortOrder: true },
			});
			nextSortOrder = (lastCategory?.sortOrder ?? 0) + 1;
		}

		const category = await sqlClient.category.create({
			data: {
				storeId,
				name,
				isFeatured: isFeatured ?? false,
				sortOrder: nextSortOrder,
			},
		});

		return {
			category: mapCategoryToColumn({ ...category, ProductCategories: [] }),
		};
	});
