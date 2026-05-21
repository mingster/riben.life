import { z } from "zod";

export const updateWaitlistSettingsSchema = z.object({
	enabled: z.boolean(),
	requireSignIn: z.boolean(),
	requireName: z.boolean(),
	requirePhone: z.boolean(),
	/** Minutes relative to nominal open; negative delays join until after open. */
	canGetNumBefore: z.number().int(),
	missedTurnEnabled: z.boolean(),
	missedTurnMinutesAfterCall: z.coerce.number().int().min(1).max(120),
	missedTurnRequeuePositionFromTop: z.coerce.number().int().min(1).max(99),
	showQueueOnWaitlistPage: z.boolean(),
});

export type UpdateWaitlistSettingsInput = z.infer<
	typeof updateWaitlistSettingsSchema
>;
