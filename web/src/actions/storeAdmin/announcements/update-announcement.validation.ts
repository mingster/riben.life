import { z } from "zod";

export const updateAnnouncementSchema = z.object({
	id: z.string().min(1),
	name: z.string().optional(),
	published: z.boolean(),
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
