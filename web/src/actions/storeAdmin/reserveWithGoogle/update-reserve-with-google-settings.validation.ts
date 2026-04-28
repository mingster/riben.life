import { z } from "zod";

export const updateReserveWithGoogleSettingsSchema = z.object({
	reserveWithGoogleEnabled: z.boolean().optional(),
	googleBusinessProfileId: z.string().trim().nullable().optional(),
	googleBusinessProfileName: z.string().trim().nullable().optional(),
});

export type UpdateReserveWithGoogleSettingsInput = z.infer<
	typeof updateReserveWithGoogleSettingsSchema
>;
