import { z } from "zod";

import type { CronJobId } from "@/lib/cron/cron-job-catalog";

const cronJobIdSchema = z.enum([
	"sendmail",
	"process-notification-queue",
	"cleanup-unpaid-rsvps",
	"process-reminders",
	"process-rsvp-customer-confirm",
	"sync-delivery-status",
]) satisfies z.ZodType<CronJobId>;

/**
 * Input for running a single cron job via internal HTTP (Bearer CRON_SECRET). Optional fields
 * apply only to jobs that support them; others are ignored server-side.
 */
export const runSysadminCronSchema = z.object({
	jobId: cronJobIdSchema,
	batchSize: z.coerce.number().int().min(1).max(1000).optional(),
	maxConcurrent: z.coerce.number().int().min(1).max(100).optional(),
	notificationBatchSize: z.coerce.number().int().min(1).max(500).optional(),
	ageMinutes: z.coerce
		.number()
		.int()
		.min(1)
		.max(24 * 60)
		.optional(),
});

export type RunSysadminCronInput = z.infer<typeof runSysadminCronSchema>;
