import { z } from "zod";

export const cancelWaitlistEntrySchema = z.object({
	waitlistId: z.string().min(1, "Waitlist entry ID is required"),
});

export type CancelWaitlistEntryInput = z.infer<
	typeof cancelWaitlistEntrySchema
>;
