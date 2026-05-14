"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";

import { upsertSystemMessageLocaleSchema } from "./upsert-system-message-locale.validation";

export const upsertSystemMessageLocaleAction = adminActionClient
	.metadata({ name: "upsertSystemMessageLocale" })
	.schema(upsertSystemMessageLocaleSchema)
	.action(async ({ parsedInput: { messageId, localeId, message } }) => {
		return sqlClient.systemMessageLocale.upsert({
			where: { messageId_localeId: { messageId, localeId } },
			create: { messageId, localeId, message },
			update: { message },
		});
	});
