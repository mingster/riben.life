import { z } from "zod";

export const updateFaqCategorySchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
	id: z.string(),
	storeId: z.string().min(1, "Store is required"),
	localeId: z.string().min(1, "Locale is required"),
	name: z.string().min(1, "Category name is required"),
	sortOrder: z.coerce.number().min(1),
});

export type UpdateFaqCategoryInput = z.infer<typeof updateFaqCategorySchema>;
