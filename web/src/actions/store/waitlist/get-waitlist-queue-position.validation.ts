import { z } from "zod";

export const getWaitlistQueuePositionSchema = z.object({
	storeId: z.string().min(1),
	waitlistId: z.string().min(1),
	verificationCode: z
		.string()
		.length(6)
		.regex(/^\d{6}$/),
});

export type GetWaitlistQueuePositionInput = z.infer<
	typeof getWaitlistQueuePositionSchema
>;
