import { z } from "zod";

export const createAnnouncementSchema = z.object({
	storeId: z.string().min(1),
	message: z.string().min(1),
});
