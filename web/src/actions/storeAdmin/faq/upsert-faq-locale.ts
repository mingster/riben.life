"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { upsertFaqLocaleSchema } from "./upsert-faq-locale.validation";

export const upsertFaqLocaleAction = storeActionClient
	.metadata({ name: "upsertFaqLocale" })
	.schema(upsertFaqLocaleSchema)
	.action(async ({ parsedInput: { faqId, localeId, question, answer } }) => {
		return sqlClient.faqLocale.upsert({
			where: { faqId_localeId: { faqId, localeId } },
			create: { faqId, localeId, question, answer },
			update: { question, answer },
		});
	});
