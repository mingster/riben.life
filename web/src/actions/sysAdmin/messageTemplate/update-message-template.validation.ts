import { z } from "zod/v4";

export const updateMessageTemplateSchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
	id: z.string(),
	name: z.string().min(1, "Message template name is required"),
});

export type UpdateMessageTemplateInput = z.infer<
	typeof updateMessageTemplateSchema
>;
