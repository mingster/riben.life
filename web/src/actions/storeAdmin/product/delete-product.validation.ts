import { z } from "zod/v4";

export const deleteProductSchema = z.object({
	storeId: z.string().min(1),
	productId: z.string().min(1),
});

export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
