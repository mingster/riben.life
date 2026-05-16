import { z } from "zod";

export const upsertFaqLocaleSchema = z.object({
	faqId: z.string().min(1),
	localeId: z.string().min(1),
	question: z.string().min(1),
	answer: z.string().min(1),
});

export type UpsertFaqLocaleInput = z.infer<typeof upsertFaqLocaleSchema>;
