import { z } from "zod";

/** Bulk-add dialog: textarea lines + status (parsed to `entries` in the component). */
export const createStoreProductsBulkFormSchema = z.object({
	lines: z.string().min(1, { message: "lines is required" }),
	status: z.coerce.number().int(),
});

export type CreateStoreProductsBulkFormInput = z.infer<
	typeof createStoreProductsBulkFormSchema
>;

export const createStoreProductsBulkSchema = z.object({
	status: z.number(),
	entries: z
		.array(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				price: z.number().optional(),
				categoryName: z.string().optional(),
				optionTemplateName: z.string().optional(),
			}),
		)
		.min(1, "At least one product is required"),
});

export type CreateStoreProductsBulkInput = z.infer<
	typeof createStoreProductsBulkSchema
>;
