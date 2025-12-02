import { z } from "zod";

export const deleteProductOptionTemplateSchema = z.object({
	id: z.string().min(1),
});
