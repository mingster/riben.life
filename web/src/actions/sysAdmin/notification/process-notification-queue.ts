"use server";

import logger from "@/lib/logger";
import { QueueManager } from "@/lib/notification/queue-manager";
import { adminActionClient } from "@/utils/actions/safe-action";
import { processNotificationQueueSchema } from "./process-notification-queue.validation";

/**
 * Server action to process the notification queue (LINE, On-Site, push, email queue items).
 * Requires admin authentication. Same logic as the cron endpoint process-notification-queue.
 */
export const processNotificationQueueAction = adminActionClient
	.metadata({ name: "processNotificationQueue" })
	.schema(processNotificationQueueSchema)
	.action(async ({ parsedInput }) => {
		try {
			const batchSize = parsedInput.batchSize ?? 100;
			const queueManager = new QueueManager();
			const result = await queueManager.processBatch(batchSize);

			logger.info("Notification queue processed via admin action", {
				metadata: {
					processed: result.processed,
					successful: result.successful,
					failed: result.failed,
				},
				tags: ["notification-queue", "admin", "success"],
			});

			return {
				data: {
					processed: result.processed,
					successful: result.successful,
					failed: result.failed,
				},
			};
		} catch (error) {
			logger.error("Process notification queue failed", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["notification-queue", "admin", "error"],
			});
			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to process notification queue",
			};
		}
	});
