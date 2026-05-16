"use server";

import { sqlClient } from "@/lib/prismadb";
import type { Faq } from "@/types";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateFaqSchema } from "./update-faq.validation";

export const updateFaqAction = storeActionClient
	.metadata({ name: "updateFaq" })
	.schema(updateFaqSchema)
	.action(
		async ({
			parsedInput: { id, categoryId, sortOrder, published, locales },
		}) => {
			const now = getUtcNowEpoch();

			const localeEntries = Object.entries(locales).filter(
				([_, val]) => val.question.trim() !== "" || val.answer.trim() !== "",
			);
			const emptyLocaleIds = Object.entries(locales)
				.filter(
					([_, val]) => val.question.trim() === "" && val.answer.trim() === "",
				)
				.map(([localeId]) => localeId);

			if (!id || id === "new") {
				const created = await sqlClient.faq.create({
					data: {
						categoryId,
						sortOrder,
						published,
						createdOn: now,
						updatedOn: now,
						locales: {
							create: localeEntries.map(([localeId, val]) => ({
								localeId,
								question: val.question,
								answer: val.answer,
							})),
						},
					},
					include: { locales: true },
				});
				return created as Faq;
			}

			const updated = await sqlClient.faq.update({
				where: { id },
				data: {
					sortOrder,
					published,
					updatedOn: now,
					locales: {
						deleteMany: { localeId: { in: emptyLocaleIds } },
						upsert: localeEntries.map(([localeId, val]) => ({
							where: { faqId_localeId: { faqId: id, localeId } },
							update: { question: val.question, answer: val.answer },
							create: {
								localeId,
								question: val.question,
								answer: val.answer,
							},
						})),
					},
				},
				include: { locales: true },
			});
			return updated as Faq;
		},
	);
