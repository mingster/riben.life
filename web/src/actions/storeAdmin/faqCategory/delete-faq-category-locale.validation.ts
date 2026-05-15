import { z } from "zod";

export const deleteFaqCategoryLocaleSchema = z.object({
	id: z.string().min(1),
});

export type DeleteFaqCategoryLocaleInput = z.infer<
	typeof deleteFaqCategoryLocaleSchema
>;
