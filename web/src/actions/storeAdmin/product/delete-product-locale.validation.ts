import { z } from "zod";

export const deleteProductLocaleSchema = z.object({
	id: z.string().min(1),
});
