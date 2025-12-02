import { z } from "zod";

export const createCategoriesSchema = z.object({
	names: z.array(z.string().min(1)).min(1),
	isFeatured: z.boolean().optional(),
});
