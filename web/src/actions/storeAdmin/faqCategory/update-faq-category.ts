"use server";

import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateFaqCategorySchema } from "./update-faq-category.validation";

export const updateFaqCategoryAction = storeActionClient
	.metadata({ name: "updateFaqCategory" })
	.schema(updateFaqCategorySchema)
	.action(
		async ({
			parsedInput: { id, sortOrder, published, locales },
			bindArgsClientInputs,
		}) => {
			const storeId = bindArgsClientInputs[0] as string;
			const now = getUtcNowEpoch();

			const localeEntries = Object.entries(locales).filter(
				([_, name]) => name.trim() !== "",
			);
			const emptyLocaleIds = Object.entries(locales)
				.filter(([_, name]) => name.trim() === "")
				.map(([localeId]) => localeId);

			if (!id || id === "new") {
				const created = await sqlClient.faqCategory.create({
					data: {
						storeId,
						sortOrder,
						published,
						createdOn: now,
						updatedOn: now,
						locales: {
							create: localeEntries.map(([localeId, name]) => ({
								localeId,
								name,
							})),
						},
					},
					include: { locales: true, FAQ: { include: { locales: true } } },
				});
				return created as FaqCategory;
			}

			const updated = await sqlClient.faqCategory.update({
				where: { id },
				data: {
					sortOrder,
					published,
					updatedOn: now,
					locales: {
						deleteMany: { localeId: { in: emptyLocaleIds } },
						upsert: localeEntries.map(([localeId, name]) => ({
							where: { categoryId_localeId: { categoryId: id, localeId } },
							update: { name },
							create: { localeId, name },
						})),
					},
				},
				include: { locales: true, FAQ: { include: { locales: true } } },
			});
			return updated as FaqCategory;
		},
	);
