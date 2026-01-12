import { z } from "zod";

export const noShowRsvpSchema = z.object({
	id: z.string().min(1, "RSVP ID is required"),
});

export type NoShowRsvpInput = z.infer<typeof noShowRsvpSchema>;
