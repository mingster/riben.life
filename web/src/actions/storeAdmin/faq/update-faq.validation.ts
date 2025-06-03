import { z } from "zod";

export const updateFaqSchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
	id: z.string(),
	categoryId: z.string().min(1, "categoryId is required"),
	question: z.string().min(1, "question is required"),
	answer: z.string().min(1, "answer is required"),
	sortOrder: z.coerce.number().min(1),
	published: z.boolean(),
});

export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
