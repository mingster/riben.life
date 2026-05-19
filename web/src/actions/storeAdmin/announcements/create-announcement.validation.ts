import { z } from "zod";

export const createAnnouncementSchema = z.object({
	name: z.string().optional(),
	published: z.boolean(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
