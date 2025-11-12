import { z } from "zod";

export const deleteProductOptionTemplateSchema = z.object({
	storeId: z.string().min(1),
	id: z.string().min(1),
});
