import { z } from "zod";

export const cancelRsvpSchema = z.object({
	id: z.string().min(1, "RSVP ID is required"),
});

export type CancelRsvpInput = z.infer<typeof cancelRsvpSchema>;
