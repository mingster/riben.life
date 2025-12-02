import { z } from "zod";

export const createCategorySchema = z.object({
	name: z.string().min(1),
	sortOrder: z.coerce.number().int().min(1).optional(),
	isFeatured: z.boolean().optional(),
});
