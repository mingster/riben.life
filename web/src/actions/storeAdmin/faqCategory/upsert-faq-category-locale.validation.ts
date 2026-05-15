import { z } from "zod";

export const upsertFaqCategoryLocaleSchema = z.object({
	categoryId: z.string().min(1),
	localeId: z.string().min(1),
	name: z.string().min(1),
});

export type UpsertFaqCategoryLocaleInput = z.infer<
	typeof upsertFaqCategoryLocaleSchema
>;
