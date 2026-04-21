import { z } from "zod";

export const createAnnouncementSchema = z.object({
	message: z.string().min(1),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
