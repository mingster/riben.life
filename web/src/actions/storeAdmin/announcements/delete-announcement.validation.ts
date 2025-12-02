import { z } from "zod";

export const deleteAnnouncementSchema = z.object({
	id: z.string().min(1),
});
