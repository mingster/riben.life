import { z } from "zod";

export const deleteFaqLocaleSchema = z.object({
	id: z.string().min(1),
});

export type DeleteFaqLocaleInput = z.infer<typeof deleteFaqLocaleSchema>;
