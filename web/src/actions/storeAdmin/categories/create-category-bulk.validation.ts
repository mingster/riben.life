import { z } from "zod";

export const createCategoriesSchema = z.object({
	names: z.array(z.string().min(1)).min(1),
	isFeatured: z.boolean().optional(),
});

/** Bulk-add dialog: newline-separated names + featured toggle. */
export const createCategoriesBulkFormSchema = z
	.object({
		names: z.string().min(1, { message: "names is required" }),
		isFeatured: z.boolean().default(true),
	})
	.refine(
		(val) =>
			val.names
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean).length > 0,
		{ message: "At least one category name is required.", path: ["names"] },
	);

export type CreateCategoriesBulkFormInput = z.infer<
	typeof createCategoriesBulkFormSchema
>;
