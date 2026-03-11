import { z } from "zod";

export const listWaitlistSchema = z.object({
	statusFilter: z.enum(["active", "all"]).optional().default("active"),
});

export type ListWaitlistInput = z.infer<typeof listWaitlistSchema>;
