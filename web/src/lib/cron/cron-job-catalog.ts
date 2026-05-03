/**
 * Single source of truth for SysAdmin cron management: API paths, defaults aligned with
 * `web/bin/run-*-cron.sh`, log hints, and crontab line generation (see `web/doc/dev_op/DEPLOYMENT.md`).
 */

/** Max characters returned to the UI for cron HTTP response bodies (preview). */
export const CRON_BODY_PREVIEW_MAX_CHARS = 48 * 1024;

export type CronJobId =
	| "sendmail"
	| "process-notification-queue"
	| "cleanup-unpaid-rsvps"
	| "process-reminders"
	| "process-rsvp-customer-confirm"
	| "sync-delivery-status";

export interface CronJobDefinition {
	readonly id: CronJobId;
	/** i18n key under `translation` namespace */
	readonly labelTranslationKey: string;
	readonly apiPath: string;
	/** Default query string values (stringified) matching shell scripts / route defaults */
	readonly defaultQuery: Record<string, string>;
	readonly scriptRelativePath: string;
	readonly logFileHint: string;
	readonly supportsBatchSize: boolean;
	readonly supportsMaxConcurrent: boolean;
	readonly supportsNotificationBatchSize: boolean;
	readonly supportsAgeMinutes: boolean;
}

export const CRON_JOB_DEFINITIONS: readonly CronJobDefinition[] = [
	{
		id: "sendmail",
		labelTranslationKey: "sysadmin_cron_job_sendmail",
		apiPath: "/api/cron-jobs/sendmail",
		defaultQuery: { batchSize: "10", maxConcurrent: "3" },
		scriptRelativePath: "bin/run-sendmail-cron.sh",
		logFileHint: "/var/log/sendmail.log",
		supportsBatchSize: true,
		supportsMaxConcurrent: true,
		supportsNotificationBatchSize: false,
		supportsAgeMinutes: false,
	},
	{
		id: "process-notification-queue",
		labelTranslationKey: "sysadmin_cron_job_process_notification_queue",
		apiPath: "/api/cron-jobs/process-notification-queue",
		defaultQuery: { batchSize: "100" },
		scriptRelativePath: "bin/run-process-notification-queue-cron.sh",
		logFileHint: "/var/log/process-notification-queue.log",
		supportsBatchSize: false,
		supportsMaxConcurrent: false,
		supportsNotificationBatchSize: true,
		supportsAgeMinutes: false,
	},
	{
		id: "cleanup-unpaid-rsvps",
		labelTranslationKey: "sysadmin_cron_job_cleanup_unpaid_rsvps",
		apiPath: "/api/cron-jobs/cleanup-unpaid-rsvps",
		// Shell script `run-cleanup-unpaid-rsvps-cron.sh` defaults AGE_MINUTES to 30 (API route default is 5 if omitted)
		defaultQuery: { ageMinutes: "30" },
		scriptRelativePath: "bin/run-cleanup-unpaid-rsvps-cron.sh",
		logFileHint: "/var/log/cleanup-unpaid-rsvps.log",
		supportsBatchSize: false,
		supportsMaxConcurrent: false,
		supportsNotificationBatchSize: false,
		supportsAgeMinutes: true,
	},
	{
		id: "process-reminders",
		labelTranslationKey: "sysadmin_cron_job_process_reminders",
		apiPath: "/api/cron-jobs/process-reminders",
		defaultQuery: {},
		scriptRelativePath: "bin/run-rsvp-reminders-cron.sh",
		logFileHint: "/var/log/rsvp-reminders.log",
		supportsBatchSize: false,
		supportsMaxConcurrent: false,
		supportsNotificationBatchSize: false,
		supportsAgeMinutes: false,
	},
	{
		id: "process-rsvp-customer-confirm",
		labelTranslationKey: "sysadmin_cron_job_process_rsvp_customer_confirm",
		apiPath: "/api/cron-jobs/process-rsvp-customer-confirm",
		defaultQuery: {},
		scriptRelativePath: "bin/run-rsvp-customer-confirm-cron.sh",
		logFileHint: "/var/log/rsvp-customer-confirm.log",
		supportsBatchSize: false,
		supportsMaxConcurrent: false,
		supportsNotificationBatchSize: false,
		supportsAgeMinutes: false,
	},
	{
		id: "sync-delivery-status",
		labelTranslationKey: "sysadmin_cron_job_sync_delivery_status",
		apiPath: "/api/cron-jobs/sync-delivery-status",
		defaultQuery: {},
		scriptRelativePath: "bin/run-sync-delivery-status-cron.sh",
		logFileHint: "/var/log/sync-delivery-status.log",
		supportsBatchSize: false,
		supportsMaxConcurrent: false,
		supportsNotificationBatchSize: false,
		supportsAgeMinutes: false,
	},
] as const;

export function getCronJobDefinition(jobId: CronJobId): CronJobDefinition {
	const found = CRON_JOB_DEFINITIONS.find((j) => j.id === jobId);
	if (!found) {
		throw new Error(`Unknown cron job id: ${jobId}`);
	}
	return found;
}

/** Normalize deploy root: trim and strip trailing slashes. */
export function normalizeDeployRoot(deployRoot: string): string {
	return deployRoot.trim().replace(/\/+$/, "") || "/var/www/riben.life/web";
}

export type SendmailScheduleMode = "single" | "stagger6";
export type NotificationScheduleMode = "single" | "stagger6";
export type SyncDeliveryScheduleMode = "every5" | "hourly";

export interface CrontabGeneratorOptions {
	readonly deployRoot: string;
	readonly sendmailMode: SendmailScheduleMode;
	readonly notificationMode: NotificationScheduleMode;
	readonly syncDeliveryMode: SyncDeliveryScheduleMode;
}

function staggerLines(
	schedulePrefix: string,
	deployRoot: string,
	scriptRelativePath: string,
	logPath: string,
): string[] {
	const prefix = `${schedulePrefix} . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`;
	return [
		prefix,
		`* * * * * sleep 10; . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`,
		`* * * * * sleep 20; . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`,
		`* * * * * sleep 30; . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`,
		`* * * * * sleep 40; . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`,
		`* * * * * sleep 50; . ~/.bashrc && ${deployRoot}/${scriptRelativePath} >> ${logPath} 2>&1`,
	];
}

/**
 * Recommended host crontab block from DEPLOYMENT.md (schedules + script paths).
 * Does not embed CRON_SECRET; ensure it is set in the cron environment or ~/.bashrc.
 */
export function generateCrontabBlock(options: CrontabGeneratorOptions): string {
	const deployRoot = normalizeDeployRoot(options.deployRoot);
	const lines: string[] = [
		"# riben.life — cron jobs (generated). Set CRON_SECRET in environment (see DEPLOYMENT.md).",
		"",
		"# Send emails from queue",
	];

	const sendLog = "/var/log/sendmail.log";
	const sendScript = "bin/run-sendmail-cron.sh";
	if (options.sendmailMode === "stagger6") {
		lines.push(...staggerLines("* * * * *", deployRoot, sendScript, sendLog));
	} else {
		lines.push(
			`* * * * * . ~/.bashrc && ${deployRoot}/${sendScript} >> ${sendLog} 2>&1`,
		);
	}

	lines.push(
		"",
		"# Process notification queue (LINE, on-site, push, email queue)",
	);
	const notifLog = "/var/log/process-notification-queue.log";
	const notifScript = "bin/run-process-notification-queue-cron.sh";
	if (options.notificationMode === "stagger6") {
		lines.push(...staggerLines("* * * * *", deployRoot, notifScript, notifLog));
	} else {
		lines.push(
			`* * * * * . ~/.bashrc && ${deployRoot}/${notifScript} >> ${notifLog} 2>&1`,
		);
	}

	lines.push(
		"",
		"# Cleanup unpaid RSVPs (every 5 minutes)",
		`*/5 * * * * . ~/.bashrc && ${deployRoot}/bin/run-cleanup-unpaid-rsvps-cron.sh >> /var/log/cleanup-unpaid-rsvps.log 2>&1`,
		"",
		"# RSVP reminder notifications (every 5 minutes)",
		`*/5 * * * * . ~/.bashrc && ${deployRoot}/bin/run-rsvp-reminders-cron.sh >> /var/log/rsvp-reminders.log 2>&1`,
		"",
		"# RSVP customer confirm reminders (every 10 minutes)",
		`*/10 * * * * . ~/.bashrc && ${deployRoot}/bin/run-rsvp-customer-confirm-cron.sh >> /var/log/rsvp-customer-confirm.log 2>&1`,
		"",
		"# Sync notification delivery statuses",
	);

	if (options.syncDeliveryMode === "hourly") {
		lines.push(
			`0 * * * * . ~/.bashrc && ${deployRoot}/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1`,
		);
	} else {
		lines.push(
			`*/5 * * * * . ~/.bashrc && ${deployRoot}/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1`,
		);
	}

	return lines.join("\n");
}

/**
 * Base URL for server-side GET to cron API routes. Mirrors mail URL precedence; do not use
 * `getBaseUrlForMail` verbatim (production mail helper may be overridden independently).
 */
export function getCronFetchBaseUrl(): string {
	const explicit =
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
	if (explicit) {
		return explicit.replace(/\/+$/, "");
	}
	if (process.env.NODE_ENV === "development") {
		return "http://localhost:3001";
	}
	return "https://riben.life";
}

export function buildCronJobUrl(
	job: CronJobDefinition,
	query: Record<string, string>,
): string {
	const base = getCronFetchBaseUrl();
	const url = new URL(job.apiPath, base.endsWith("/") ? base : `${base}/`);
	for (const [k, v] of Object.entries(query)) {
		url.searchParams.set(k, v);
	}
	return url.toString();
}
