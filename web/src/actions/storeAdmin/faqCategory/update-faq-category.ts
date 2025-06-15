"use server";

import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { updateFaqCategorySchema } from "./update-faq-category.validation";

export const updateFaqCategoryAction = storeOwnerActionClient
	.metadata({ name: "updateFaqCategory" })
	.schema(updateFaqCategorySchema)
	.action(
		async ({ parsedInput: { id, localeId, storeId, name, sortOrder } }) => {
			console.log("id", id);

			//if there's no id, then this is a new message
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.faqCategory.create({
					data: { localeId, storeId, name, sortOrder },
				});
				id = result.id;

				console.log("create", result);
			}

			await sqlClient.faqCategory.update({
				where: { id },
				data: { localeId, storeId, name, sortOrder },
			});
			console.log("update", id);

			const result = (await sqlClient.faqCategory.findFirst({
				where: { id },
				include: {
					FAQ: true,
				},
			})) as FaqCategory;

			return result;
		},
	);
