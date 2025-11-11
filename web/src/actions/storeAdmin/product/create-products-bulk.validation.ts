import { z } from "zod";

export const createStoreProductsBulkSchema = z.object({
	storeId: z.string().min(1),
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
