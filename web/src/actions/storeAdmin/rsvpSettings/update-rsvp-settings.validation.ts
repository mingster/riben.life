import { z } from "zod";

export const updateRsvpSettingsSchema = z.object({
	acceptReservation: z.boolean().optional(),
	prepaidRequired: z.boolean().optional(),
	minPrepaidAmount: z.number().nonnegative().nullable().optional(),
	canCancel: z.boolean().optional(),
	cancelHours: z.number().int().min(0).optional(),
	defaultDuration: z.number().int().min(1).optional(),
	requireSignature: z.boolean().optional(),
	showCostToCustomer: z.boolean().optional(),
	useBusinessHours: z.boolean().optional(),
	rsvpHours: z.string().nullable().optional(),
	reminderHours: z.number().int().min(0).optional(),
	useReminderSMS: z.boolean().optional(),
	useReminderLine: z.boolean().optional(),
	useReminderEmail: z.boolean().optional(),
	syncWithGoogle: z.boolean().optional(),
	syncWithApple: z.boolean().optional(),
	// Reserve with Google integration fields
	reserveWithGoogleEnabled: z.boolean().optional(),
	googleBusinessProfileId: z.string().nullable().optional(),
	googleBusinessProfileName: z.string().nullable().optional(),
	reserveWithGoogleAccessToken: z.string().nullable().optional(),
	reserveWithGoogleRefreshToken: z.string().nullable().optional(),
	reserveWithGoogleTokenExpiry: z.coerce.date().nullable().optional(),
	reserveWithGoogleLastSync: z.coerce.date().nullable().optional(),
	reserveWithGoogleSyncStatus: z.string().nullable().optional(),
	reserveWithGoogleError: z.string().nullable().optional(),
});

export type UpdateRsvpSettingsInput = z.infer<typeof updateRsvpSettingsSchema>;
