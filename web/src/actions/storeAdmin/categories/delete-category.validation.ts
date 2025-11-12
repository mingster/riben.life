import { z } from "zod";

export const deleteCategorySchema = z.object({
	storeId: z.string().min(1),
	id: z.string().min(1),
});
