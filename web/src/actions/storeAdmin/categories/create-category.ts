"use server";

import { mapCategoryToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/categories/category-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { createCategorySchema } from "./create-category.validation";

export const createStoreCategoryAction = storeActionClient
	.metadata({ name: "createCategory" })
	.schema(createCategorySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { name, sortOrder, isFeatured } = parsedInput;

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
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return {
			category: mapCategoryToColumn({ ...category, ProductCategories: [] }),
		};
	});
