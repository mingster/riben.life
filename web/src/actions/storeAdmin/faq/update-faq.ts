"use server";

import { sqlClient } from "@/lib/prismadb";
import type { Faq } from "@/types";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateFaqSchema } from "./update-faq.validation";

export const updateFaqAction = storeActionClient
	.metadata({ name: "updateFaq" })
	.schema(updateFaqSchema)
	.action(async ({ parsedInput: { id, categoryId, sortOrder, published } }) => {
		const now = getUtcNowEpoch();

		if (!id || id === "new") {
			const created = await sqlClient.faq.create({
				data: {
					categoryId,
					sortOrder,
					published,
					createdOn: now,
					updatedOn: now,
				},
				include: { locales: true },
			});
			return created as Faq;
		}

		const updated = await sqlClient.faq.update({
			where: { id },
			data: { sortOrder, published, updatedOn: now },
			include: { locales: true },
		});
		return updated as Faq;
	});
