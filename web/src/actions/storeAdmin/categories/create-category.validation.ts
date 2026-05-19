import { z } from "zod";

export const createCategorySchema = z.object({
	name: z.string().optional(),
	locales: z.record(z.string(), z.string()).optional(),
	sortOrder: z.coerce.number().int().min(1).optional(),
	isFeatured: z.boolean().optional(),
});
