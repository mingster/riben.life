import { z } from "zod";

export const updateCategorySchema = z.object({
	storeId: z.string().min(1),
	id: z.string().min(1),
	name: z.string().min(1),
	sortOrder: z.coerce.number().int().min(1),
	isFeatured: z.boolean(),
});
