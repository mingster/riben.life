"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";

import { deleteSystemMessageLocaleSchema } from "./delete-system-message-locale.validation";

export const deleteSystemMessageLocaleAction = adminActionClient
	.metadata({ name: "deleteSystemMessageLocale" })
	.schema(deleteSystemMessageLocaleSchema)
	.action(async ({ parsedInput: { id } }) => {
		return sqlClient.systemMessageLocale.delete({ where: { id } });
	});
