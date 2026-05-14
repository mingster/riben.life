import { z } from "zod";

export const updateSystemMessageSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	published: z.boolean(),
});

export type UpdateSystemMessageInput = z.infer<
	typeof updateSystemMessageSchema
>;
