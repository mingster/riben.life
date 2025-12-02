import { z } from "zod";

export const createStoreProductSchema = z.object({
	name: z.string().min(1, "Product name is required"),
	description: z.string().optional().default(""),
	price: z.coerce.number().min(0).default(0),
	currency: z.string().optional().default("usd"),
	status: z.coerce.number().default(0),
	isFeatured: z.boolean().optional().default(false),
});

export type CreateStoreProductInput = z.infer<typeof createStoreProductSchema>;
