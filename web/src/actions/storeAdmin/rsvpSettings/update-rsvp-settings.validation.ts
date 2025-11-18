import { z } from "zod";

export const updateRsvpSettingsSchema = z.object({
	storeId: z.string().uuid(),
	acceptReservation: z.boolean().optional(),
	prepaidRequired: z.boolean().optional(),
	prepaidAmount: z.number().nonnegative().nullable().optional(),
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
});

export type UpdateRsvpSettingsInput = z.infer<typeof updateRsvpSettingsSchema>;
