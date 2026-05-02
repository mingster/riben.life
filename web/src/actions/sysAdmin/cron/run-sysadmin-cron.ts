"use server";

import { runSysadminCronSchema } from "@/actions/sysAdmin/cron/run-sysadmin-cron.validation";
import {
	CRON_BODY_PREVIEW_MAX_CHARS,
	buildCronJobUrl,
	getCronJobDefinition,
} from "@/lib/cron/cron-job-catalog";
import logger from "@/lib/logger";
import { adminActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";

const CRON_FETCH_TIMEOUT_MS = 300_000;

export const runSysadminCronAction = adminActionClient
	.metadata({ name: "runSysadminCron" })
	.schema(runSysadminCronSchema)
	.action(
		async ({
			parsedInput: {
				jobId,
				batchSize,
				maxConcurrent,
				notificationBatchSize,
				ageMinutes,
			},
		}) => {
			const secret = process.env.CRON_SECRET;
			if (!secret || secret.trim() === "") {
				throw new SafeError(
					"CRON_SECRET is not configured on the server. Add it to the environment to run cron jobs from the admin UI.",
				);
			}

			const def = getCronJobDefinition(jobId);
			const query: Record<string, string> = { ...def.defaultQuery };

			if (def.supportsBatchSize && batchSize !== undefined) {
				query.batchSize = String(batchSize);
			}
			if (def.supportsMaxConcurrent && maxConcurrent !== undefined) {
				query.maxConcurrent = String(maxConcurrent);
			}
			if (
				def.supportsNotificationBatchSize &&
				notificationBatchSize !== undefined
			) {
				query.batchSize = String(notificationBatchSize);
			}
			if (def.supportsAgeMinutes && ageMinutes !== undefined) {
				query.ageMinutes = String(ageMinutes);
			}

			const url = buildCronJobUrl(def, query);
			const started = Date.now();

			let response: Response;
			try {
				response = await fetch(url, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${secret}`,
					},
					signal: AbortSignal.timeout(CRON_FETCH_TIMEOUT_MS),
					cache: "no-store",
				});
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				logger.error("SysAdmin cron fetch failed", {
					metadata: { jobId, url, error: message },
					tags: ["sysadmin", "cron", "error"],
				});
				throw new SafeError(`Cron request failed: ${message}`);
			}

			const durationMs = Date.now() - started;
			const rawText = await response.text();
			const truncated = rawText.length > CRON_BODY_PREVIEW_MAX_CHARS;
			const bodyPreview = truncated
				? `${rawText.slice(0, CRON_BODY_PREVIEW_MAX_CHARS)}\n\n… (truncated)`
				: rawText;

			if (response.ok) {
				logger.info("SysAdmin cron run completed", {
					metadata: { jobId, httpStatus: response.status, durationMs },
					tags: ["sysadmin", "cron"],
				});
			} else {
				logger.warn("SysAdmin cron run returned non-success status", {
					metadata: {
						jobId,
						httpStatus: response.status,
						durationMs,
						bodyLength: rawText.length,
					},
					tags: ["sysadmin", "cron", "warn"],
				});
			}

			return {
				jobId,
				httpStatus: response.status,
				durationMs,
				bodyPreview,
				truncated,
			};
		},
	);
