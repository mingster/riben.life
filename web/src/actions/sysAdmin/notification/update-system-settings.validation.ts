import { z } from "zod";

export const updateSystemNotificationSettingsSchema = z.object({
	id: z.string(),
	notificationsEnabled: z.boolean(),

	// Plugin channel enable/disable (system-wide)
	lineEnabled: z.boolean().default(false),
	whatsappEnabled: z.boolean().default(false),
	wechatEnabled: z.boolean().default(false),
	smsEnabled: z.boolean().default(false),
	telegramEnabled: z.boolean().default(false),
	pushEnabled: z.boolean().default(false),

	maxRetryAttempts: z.coerce.number().int().min(1).max(10),
	retryBackoffMs: z.coerce.number().int().min(100).max(60000),
	queueBatchSize: z.coerce.number().int().min(1).max(1000),
	rateLimitPerMinute: z.coerce.number().int().min(1).max(10000),
	historyRetentionDays: z.coerce.number().int().min(1).max(365),
});

export type UpdateSystemNotificationSettingsInput = z.infer<
	typeof updateSystemNotificationSettingsSchema
>;
