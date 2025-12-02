import { z } from "zod";

export const deleteRsvpSchema = z.object({
	id: z.string().min(1, "rsvpId is required"),
});
