"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { upsertFaqCategoryLocaleSchema } from "./upsert-faq-category-locale.validation";

export const upsertFaqCategoryLocaleAction = storeActionClient
	.metadata({ name: "upsertFaqCategoryLocale" })
	.schema(upsertFaqCategoryLocaleSchema)
	.action(async ({ parsedInput: { categoryId, localeId, name } }) => {
		return sqlClient.faqCategoryLocale.upsert({
			where: { categoryId_localeId: { categoryId, localeId } },
			create: { categoryId, localeId, name },
			update: { name },
		});
	});
