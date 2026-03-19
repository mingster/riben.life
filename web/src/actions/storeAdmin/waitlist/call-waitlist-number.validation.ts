import { z } from "zod";

export const callWaitlistNumberSchema = z.object({
	waitlistId: z.string().min(1, "Waitlist entry ID is required"),
});

export type CallWaitlistNumberInput = z.infer<typeof callWaitlistNumberSchema>;
