import { z } from "zod";

export const deleteRsvpSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	id: z.string().min(1, "rsvpId is required"),
});
