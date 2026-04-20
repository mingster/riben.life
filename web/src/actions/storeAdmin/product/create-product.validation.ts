import { z } from "zod";

import { productFormExtrasSchema } from "./product-form-extras.validation";

export const createStoreProductSchema = z
	.object({
		name: z.string().min(1, "Product name is required"),
		description: z.string().optional().default(""),
		price: z.coerce.number().min(0).default(0),
		currency: z.string().optional().default("twd"),
		status: z.coerce.number().default(0),
		isFeatured: z.boolean().optional().default(false),
	})
	.merge(productFormExtrasSchema);

export type CreateStoreProductInput = z.infer<typeof createStoreProductSchema>;
