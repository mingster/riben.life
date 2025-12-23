import { z } from "zod";

export const updateRsvpBlacklistSchema = z.object({
	id: z.string().min(1, "Blacklist ID is required"),
	userId: z.string().min(1, "User ID is required"),
});

export type UpdateRsvpBlacklistInput = z.infer<
	typeof updateRsvpBlacklistSchema
>;
