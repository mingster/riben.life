import { z } from "zod";

export const updateCategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().optional(),
	locales: z.record(z.string(), z.string()).optional(),
	sortOrder: z.coerce.number().int().min(1),
	isFeatured: z.boolean(),
});

/** Create/edit category dialog body (id is bound separately when updating). */
export const updateCategoryFormSchema = updateCategorySchema.omit({ id: true });
export type UpdateCategoryFormInput = z.infer<typeof updateCategoryFormSchema>;
