import { z } from "zod";

export const completeRsvpSchema = z.object({
	id: z.string().min(1, "RSVP ID is required"),
});

export type CompleteRsvpInput = z.infer<typeof completeRsvpSchema>;
