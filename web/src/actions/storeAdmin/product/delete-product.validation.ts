import { z } from "zod";

export const deleteProductSchema = z.object({
	productId: z.string().min(1),
});

export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
