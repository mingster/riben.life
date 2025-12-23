import { z } from "zod";

export const deleteRsvpBlacklistSchema = z.object({
	id: z.string().min(1, "Blacklist ID is required"),
});
