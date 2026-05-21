import { z } from "zod";

export const requeueMissedTurnSchema = z.object({
	waitlistId: z.string().min(1),
});
