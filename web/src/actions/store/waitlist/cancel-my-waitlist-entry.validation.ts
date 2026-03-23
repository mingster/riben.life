import { z } from "zod";

/** Same identity proof as get-waitlist-queue-position (storeId + waitlistId + verificationCode). */
export const cancelMyWaitlistEntrySchema = z.object({
	storeId: z.string().min(1),
	waitlistId: z.string().min(1),
	verificationCode: z
		.string()
		.length(6)
		.regex(/^\d{6}$/),
});

export type CancelMyWaitlistEntryInput = z.infer<
	typeof cancelMyWaitlistEntrySchema
>;
