"use server";

import { mapCategoryToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/categories/category-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { createCategoriesSchema } from "./create-category-bulk.validation";

export const createStoreCategoriesAction = storeActionClient
	.metadata({ name: "createCategoriesBulk" })
	.schema(createCategoriesSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { names, isFeatured } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const lastCategory = await sqlClient.category.findFirst({
			where: { storeId },
			orderBy: { sortOrder: "desc" },
			select: { sortOrder: true },
		});

		let currentSortOrder = lastCategory?.sortOrder ?? 0;

		const operations = names.map((name) => {
			currentSortOrder += 1;
			return sqlClient.category.create({
				data: {
					storeId,
					name,
					isFeatured: isFeatured ?? true,
					sortOrder: currentSortOrder,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					ProductCategories: true,
				},
			});
		});

		const createdCategories = await sqlClient.$transaction(operations);

		return {
			createdCategories: createdCategories.map(mapCategoryToColumn),
		};
	});
