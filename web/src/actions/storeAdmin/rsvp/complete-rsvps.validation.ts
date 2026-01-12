import { z } from "zod";

export const completeRsvpsSchema = z.object({
	rsvpIds: z
		.array(z.string().min(1, "RSVP ID is required"))
		.min(1, "At least one RSVP ID is required"),
});

export type CompleteRsvpsInput = z.infer<typeof completeRsvpsSchema>;
