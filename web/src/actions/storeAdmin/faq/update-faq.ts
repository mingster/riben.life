"use server";
import { sqlClient } from "@/lib/prismadb";

import type { Faq } from "@/types";
import { storeActionClient } from "@/utils/actions/safe-action";
import { updateFaqSchema } from "./update-faq.validation";

export const updateFaqAction = storeActionClient
	.metadata({ name: "updateFaq" })
	.schema(updateFaqSchema)
	.action(
		async ({
			parsedInput: { id, categoryId, question, answer, sortOrder, published },
		}) => {
			//if there's no id, then this is a new message
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.faq.create({
					data: { categoryId, question, answer, sortOrder, published },
				});
				id = result.id;
			}

			await sqlClient.faq.update({
				where: { id },
				data: { categoryId, question, answer, sortOrder, published },
			});

			const result = (await sqlClient.faq.findFirst({
				where: { id },
				include: {
					FaqCategory: true,
				},
			})) as Faq;

			return result;
		},
	);
