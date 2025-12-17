import { z } from "zod";

export const updateStorePreferencesSchema = z.object({
	// Channel preferences
	onSiteEnabled: z.boolean().default(true),
	emailEnabled: z.boolean().default(true),
	lineEnabled: z.boolean().default(false),
	whatsappEnabled: z.boolean().default(false),
	wechatEnabled: z.boolean().default(false),
	smsEnabled: z.boolean().default(false),
	telegramEnabled: z.boolean().default(false),
	pushEnabled: z.boolean().default(false),

	// Notification type preferences
	orderNotifications: z.boolean().default(true),
	reservationNotifications: z.boolean().default(true),
	creditNotifications: z.boolean().default(true),
	paymentNotifications: z.boolean().default(true),
	systemNotifications: z.boolean().default(true),
	marketingNotifications: z.boolean().default(false),

	// Frequency preferences
	frequency: z
		.enum(["immediate", "daily_digest", "weekly_digest"])
		.default("immediate"),
});

export type UpdateStorePreferencesInput = z.infer<
	typeof updateStorePreferencesSchema
>;
