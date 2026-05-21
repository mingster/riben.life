import { z } from "zod";

export const listWaitlistPublicQueueSchema = z.object({
	storeId: z.string().min(1),
	sessionBlock: z.enum(["morning", "afternoon", "evening"]),
	waitlistId: z.string().optional(),
	verificationCode: z.string().optional(),
});

export type ListWaitlistPublicQueueInput = z.infer<
	typeof listWaitlistPublicQueueSchema
>;
