"use server";

import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateFaqCategorySchema } from "./update-faq-category.validation";
import logger from "@/lib/logger";

export const updateFaqCategoryAction = storeActionClient
	.metadata({ name: "updateFaqCategory" })
	.schema(updateFaqCategorySchema)
	.action(
		async ({ parsedInput: { id, localeId, storeId, name, sortOrder } }) => {
			logger.info("id", {
				tags: ["action"],
			});

			//if there's no id, then this is a new message
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.faqCategory.create({
					data: { localeId, storeId, name, sortOrder },
				});
				id = result.id;

				logger.info("create", {
					tags: ["action"],
				});
			}

			await sqlClient.faqCategory.update({
				where: { id },
				data: { localeId, storeId, name, sortOrder },
			});
			logger.info("update", {
				tags: ["action"],
			});

			const result = (await sqlClient.faqCategory.findFirst({
				where: { id },
				include: {
					FAQ: true,
				},
			})) as FaqCategory;

			return result;
		},
	);
