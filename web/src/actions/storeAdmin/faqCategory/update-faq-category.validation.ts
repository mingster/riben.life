import { z } from "zod";

export const updateFaqCategorySchema = z.object({
	id: z.string(),
	sortOrder: z.coerce.number().int().min(1),
	published: z.boolean(),
});

export type UpdateFaqCategoryInput = z.infer<typeof updateFaqCategorySchema>;
