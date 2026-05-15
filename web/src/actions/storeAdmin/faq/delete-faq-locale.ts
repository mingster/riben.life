"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteFaqLocaleSchema } from "./delete-faq-locale.validation";

export const deleteFaqLocaleAction = storeActionClient
	.metadata({ name: "deleteFaqLocale" })
	.schema(deleteFaqLocaleSchema)
	.action(async ({ parsedInput: { id } }) => {
		return sqlClient.faqLocale.delete({ where: { id } });
	});
