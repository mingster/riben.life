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
			parsedInput: { id, sortOrder, published },
			bindArgsClientInputs,
		}) => {
			const storeId = bindArgsClientInputs[0] as string;
			const now = getUtcNowEpoch();

			if (!id || id === "new") {
				const created = await sqlClient.faqCategory.create({
					data: {
						storeId,
						sortOrder,
						published,
						createdOn: now,
						updatedOn: now,
					},
					include: { locales: true, FAQ: { include: { locales: true } } },
				});
				return created as FaqCategory;
			}

			const updated = await sqlClient.faqCategory.update({
				where: { id },
				data: { sortOrder, published, updatedOn: now },
				include: { locales: true, FAQ: { include: { locales: true } } },
			});
			return updated as FaqCategory;
		},
	);
