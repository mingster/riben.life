import { z } from "zod";

export const createRsvpBlacklistSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
});

export type CreateRsvpBlacklistInput = z.infer<
	typeof createRsvpBlacklistSchema
>;
