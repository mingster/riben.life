import { z } from "zod";

export const updateSystemNotificationSettingsSchema = z.object({
	id: z.string(),
	notificationsEnabled: z.boolean(),
	maxRetryAttempts: z.coerce.number().int().min(1).max(10),
	retryBackoffMs: z.coerce.number().int().min(100).max(60000),
	queueBatchSize: z.coerce.number().int().min(1).max(1000),
	rateLimitPerMinute: z.coerce.number().int().min(1).max(10000),
	historyRetentionDays: z.coerce.number().int().min(1).max(365),
});

export type UpdateSystemNotificationSettingsInput = z.infer<
	typeof updateSystemNotificationSettingsSchema
>;
