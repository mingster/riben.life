import { z } from "zod";

export const createAnnouncementSchema = z.object({
	message: z.string().min(1),
});
