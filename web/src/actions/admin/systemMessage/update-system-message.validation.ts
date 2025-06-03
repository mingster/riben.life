import { z } from "zod";

export const updateSystemMessageSchema = z.object({
	//id: z.string().min(1, "ID is required"),
	id: z.string(),
	localeId: z.string().min(1, "Locale is required"),
	message: z.string().min(1, "Message is required"),
	published: z.boolean(),
});

export type UpdateSystemMessageInput = z.infer<
	typeof updateSystemMessageSchema
>;
