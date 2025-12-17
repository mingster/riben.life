/**
 * Queue Manager
 * Handles asynchronous notification processing
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type { NotificationChannel, DeliveryResult } from "./types";
import { getChannelAdapter } from "./channels";

export class QueueManager {
	/**
	 * Add notification to processing queue
	 */
	async addToQueue(
		notificationId: string,
		channels: NotificationChannel[],
	): Promise<void> {
		logger.info("Adding notification to queue", {
			metadata: { notificationId, channels },
			tags: ["queue", "add"],
		});

		// For email channel, add to EmailQueue
		if (channels.includes("email")) {
			const notification = await sqlClient.messageQueue.findUnique({
				where: { id: notificationId },
			});

			if (notification) {
				await sqlClient.emailQueue.create({
					data: {
						from: "noreply@example.com", // TODO: Get from store settings
						fromName: notification.storeId
							? "Store Notification"
							: "System Notification",
						to: "", // TODO: Get from recipient
						toName: "",
						subject: notification.subject,
						textMessage: notification.message,
						htmMessage: notification.message,
						createdOn: getUtcNowEpoch(),
						sendTries: 0,
						sentOn: null,
						storeId: notification.storeId,
						notificationId: notification.id,
						priority: notification.priority,
					},
				});
			}
		}

		// For other channels, create delivery status records
		for (const channel of channels) {
			if (channel !== "email") {
				await sqlClient.notificationDeliveryStatus.create({
					data: {
						notificationId,
						channel,
						status: "pending",
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				});
			}
		}
	}

	/**
	 * Get queued channels for a notification
	 */
	async getQueuedChannels(
		notificationId: string,
	): Promise<NotificationChannel[]> {
		const deliveryStatuses =
			await sqlClient.notificationDeliveryStatus.findMany({
				where: {
					notificationId,
					status: "pending",
				},
			});

		const channels = deliveryStatuses.map(
			(s) => s.channel as NotificationChannel,
		);

		// Check if email is queued
		const emailQueue = await sqlClient.emailQueue.findFirst({
			where: {
				notificationId,
				sentOn: null,
			},
		});

		if (emailQueue) {
			channels.push("email");
		}

		return channels;
	}

	/**
	 * Process a notification for a specific channel
	 */
	async processNotification(
		notificationId: string,
		channel: NotificationChannel,
	): Promise<DeliveryResult> {
		logger.info("Processing notification", {
			metadata: { notificationId, channel },
			tags: ["queue", "process"],
		});

		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new Error(`Notification not found: ${notificationId}`);
		}

		// Get channel adapter
		const adapter = getChannelAdapter(channel);
		if (!adapter) {
			throw new Error(`Channel adapter not found: ${channel}`);
		}

		// Check if channel is enabled for store
		if (notification.storeId) {
			const isEnabled = await adapter.isEnabled(notification.storeId);
			if (!isEnabled) {
				return {
					success: false,
					channel,
					error: `Channel ${channel} is not enabled for this store`,
				};
			}
		}

		// Get channel config
		const config = await this.getChannelConfig(
			notification.storeId || "",
			channel,
		);

		try {
			// Send notification - adapter expects Notification type
			// Prisma notification has all required fields, just cast it
			const result = await adapter.send(notification as any, config);

			// Update or create delivery status
			const existing = await sqlClient.notificationDeliveryStatus.findFirst({
				where: {
					notificationId,
					channel,
				},
			});

			if (existing) {
				await sqlClient.notificationDeliveryStatus.update({
					where: { id: existing.id },
					data: {
						status: result.success ? "sent" : "failed",
						messageId: result.messageId || null,
						errorMessage: result.error || null,
						deliveredAt: result.deliveredAt ? BigInt(result.deliveredAt) : null,
						updatedAt: getUtcNowEpoch(),
					},
				});
			} else {
				await sqlClient.notificationDeliveryStatus.create({
					data: {
						notificationId,
						channel,
						status: result.success ? "sent" : "failed",
						messageId: result.messageId || null,
						errorMessage: result.error || null,
						deliveredAt: result.deliveredAt ? BigInt(result.deliveredAt) : null,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				});
			}

			return result;
		} catch (error) {
			logger.error("Failed to process notification", {
				metadata: {
					notificationId,
					channel,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["queue", "error"],
			});

			// Update or create delivery status to failed
			const existing = await sqlClient.notificationDeliveryStatus.findFirst({
				where: {
					notificationId,
					channel,
				},
			});

			if (existing) {
				await sqlClient.notificationDeliveryStatus.update({
					where: { id: existing.id },
					data: {
						status: "failed",
						errorMessage:
							error instanceof Error ? error.message : String(error),
						updatedAt: getUtcNowEpoch(),
					},
				});
			} else {
				await sqlClient.notificationDeliveryStatus.create({
					data: {
						notificationId,
						channel,
						status: "failed",
						errorMessage:
							error instanceof Error ? error.message : String(error),
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				});
			}

			return {
				success: false,
				channel,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Process queued notifications in batches
	 */
	async processBatch(batchSize: number = 100): Promise<{
		processed: number;
		successful: number;
		failed: number;
	}> {
		logger.info("Processing notification batch", {
			metadata: { batchSize },
			tags: ["queue", "batch"],
		});

		// Get system settings for batch size
		const systemSettings =
			await sqlClient.systemNotificationSettings.findFirst();
		const effectiveBatchSize = systemSettings?.queueBatchSize || batchSize;

		// Get pending email queue items
		const emailQueueItems = await sqlClient.emailQueue.findMany({
			where: {
				sentOn: null,
				sendTries: {
					lt: systemSettings?.maxRetryAttempts || 3,
				},
			},
			orderBy: [{ priority: "desc" }, { createdOn: "asc" }],
			take: effectiveBatchSize,
		});

		// Get pending delivery statuses
		const pendingStatuses = await sqlClient.notificationDeliveryStatus.findMany(
			{
				where: {
					status: "pending",
				},
				take: effectiveBatchSize,
			},
		);

		let processed = 0;
		let successful = 0;
		let failed = 0;

		// Process email queue
		for (const emailItem of emailQueueItems) {
			if (emailItem.notificationId) {
				try {
					const result = await this.processNotification(
						emailItem.notificationId,
						"email",
					);
					processed++;
					if (result.success) {
						successful++;
					} else {
						failed++;
					}
				} catch (error) {
					processed++;
					failed++;
				}
			}
		}

		// Process other channels
		for (const status of pendingStatuses) {
			try {
				const result = await this.processNotification(
					status.notificationId,
					status.channel as NotificationChannel,
				);
				processed++;
				if (result.success) {
					successful++;
				} else {
					failed++;
				}
			} catch (error) {
				processed++;
				failed++;
			}
		}

		return { processed, successful, failed };
	}

	/**
	 * Get channel configuration for a store
	 */
	private async getChannelConfig(
		storeId: string,
		channel: NotificationChannel,
	): Promise<any> {
		if (!storeId) {
			return { enabled: false };
		}

		const config = await sqlClient.notificationChannelConfig.findUnique({
			where: {
				storeId_channel: {
					storeId,
					channel,
				},
			},
		});

		if (!config) {
			return { enabled: false };
		}

		// TODO: Decrypt credentials
		const credentials = config.credentials
			? JSON.parse(config.credentials)
			: {};
		const settings = config.settings ? JSON.parse(config.settings) : {};

		return {
			storeId: config.storeId,
			enabled: config.enabled,
			credentials,
			settings,
		};
	}
}
