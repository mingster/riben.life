import { z } from "zod";

export const updateFaqSchema = z.object({
	id: z.string(),
	categoryId: z.string().min(1),
	sortOrder: z.coerce.number().int().min(1),
	published: z.boolean(),
});

export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
