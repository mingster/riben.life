"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteFaqCategoryLocaleSchema } from "./delete-faq-category-locale.validation";

export const deleteFaqCategoryLocaleAction = storeActionClient
	.metadata({ name: "deleteFaqCategoryLocale" })
	.schema(deleteFaqCategoryLocaleSchema)
	.action(async ({ parsedInput: { id } }) => {
		return sqlClient.faqCategoryLocale.delete({ where: { id } });
	});
