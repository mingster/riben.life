import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { promises as fs } from "fs";
import path from "path";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

function normalizeCategoryLocales(
	cat: Record<string, unknown>,
): { localeId: string; name: string }[] {
	if (Array.isArray(cat.locales)) {
		return (cat.locales as Record<string, unknown>[]).map((l) => ({
			localeId: String(l.localeId),
			name: String(l.name),
		}));
	}
	if (cat.localeId && cat.name) {
		return [{ localeId: String(cat.localeId), name: String(cat.name) }];
	}
	return [];
}

function normalizeFaqLocales(
	faq: Record<string, unknown>,
): { localeId: string; question: string; answer: string }[] {
	if (Array.isArray(faq.locales)) {
		return (faq.locales as Record<string, unknown>[]).map((l) => ({
			localeId: String(l.localeId),
			question: String(l.question),
			answer: String(l.answer),
		}));
	}
	return [];
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		const { categories } = await req.json();
		if (!categories || !Array.isArray(categories)) {
			return NextResponse.json(
				{ success: false, error: "categories array is required" },
				{ status: 400 },
			);
		}

		const now = getUtcNowEpoch();

		for (const cat of categories) {
			const catLocales = normalizeCategoryLocales(cat);

			await sqlClient.faqCategory.upsert({
				where: { id: String(cat.id) },
				update: {
					sortOrder: Number(cat.sortOrder),
					published: Boolean(cat.published ?? false),
					updatedOn: now,
				},
				create: {
					id: String(cat.id),
					storeId: params.storeId,
					sortOrder: Number(cat.sortOrder),
					published: Boolean(cat.published ?? false),
					createdOn: BigInt(String(cat.createdOn ?? "0")),
					updatedOn: now,
				},
			});

			for (const loc of catLocales) {
				await sqlClient.faqCategoryLocale.upsert({
					where: {
						categoryId_localeId: {
							categoryId: String(cat.id),
							localeId: loc.localeId,
						},
					},
					update: { name: loc.name },
					create: {
						categoryId: String(cat.id),
						localeId: loc.localeId,
						name: loc.name,
					},
				});
			}

			const faqs = Array.isArray(cat.FAQ)
				? (cat.FAQ as Record<string, unknown>[])
				: [];

			for (const faq of faqs) {
				await sqlClient.faq.upsert({
					where: { id: String(faq.id) },
					update: {
						categoryId: String(faq.categoryId),
						sortOrder: Number(faq.sortOrder),
						published: Boolean(faq.published ?? false),
						updatedOn: now,
					},
					create: {
						id: String(faq.id),
						categoryId: String(faq.categoryId),
						sortOrder: Number(faq.sortOrder),
						published: Boolean(faq.published ?? false),
						createdOn: BigInt(String(faq.createdOn ?? "0")),
						updatedOn: now,
					},
				});

				let faqLocales = normalizeFaqLocales(faq);

				if (faqLocales.length === 0 && faq.question && faq.answer) {
					const parentLocaleId = catLocales[0]?.localeId;
					if (parentLocaleId) {
						faqLocales = [
							{
								localeId: parentLocaleId,
								question: String(faq.question),
								answer: String(faq.answer),
							},
						];
					}
				}

				for (const loc of faqLocales) {
					await sqlClient.faqLocale.upsert({
						where: {
							faqId_localeId: {
								faqId: String(faq.id),
								localeId: loc.localeId,
							},
						},
						update: { question: loc.question, answer: loc.answer },
						create: {
							faqId: String(faq.id),
							localeId: loc.localeId,
							question: loc.question,
							answer: loc.answer,
						},
					});
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error("faq import failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["faq", "import", "error"],
		});
		return NextResponse.json(
			{ success: false, error: (error as Error).message ?? "Unknown error" },
			{ status: 500 },
		);
	}
}
