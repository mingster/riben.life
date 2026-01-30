/**
 * Queue Manager
 * Handles asynchronous notification processing
 */

import "./register-channel-adapters";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { isValidPhoneNumberForSms } from "@/utils/phone-utils";
import type { NotificationChannel, DeliveryResult } from "./types";
import { getChannelAdapter } from "./channels";
import { NotificationRateLimiter } from "./rate-limiter";

export class QueueManager {
	private readonly rateLimiter: NotificationRateLimiter;

	constructor() {
		this.rateLimiter = new NotificationRateLimiter();
	}
	/**
	 * Add notification to processing queue
	 */
	async addToQueue(
		notificationId: string,
		channels: NotificationChannel[],
	): Promise<void> {
		// Create a copy to avoid mutating the parameter
		let channelsToProcess = [...channels];
		logger.info("Adding notification to queue", {
			metadata: { notificationId, channels },
			tags: ["queue", "add"],
		});

		// Fetch notification once if we need to validate email or SMS
		const needsValidation =
			channelsToProcess.includes("email") || channelsToProcess.includes("sms");
		const notification = needsValidation
			? await sqlClient.messageQueue.findUnique({
					where: { id: notificationId },
				})
			: null;

		// For email channel, use EmailChannel adapter to add to queue
		// This ensures consistent behavior and validation
		if (notification && channelsToProcess.includes("email")) {
			const emailAdapter = getChannelAdapter("email");
			if (emailAdapter) {
				const config = await this.getChannelConfig(
					notification.storeId || "",
					"email",
				);
				const result = await emailAdapter.send(notification as any, config);
				if (!result.success) {
					// Remove email from channels list if failed to add to queue
					channelsToProcess = channelsToProcess.filter((ch) => ch !== "email");
					logger.warn("Email channel failed to add to queue", {
						metadata: {
							notificationId,
							error: result.error,
						},
						tags: ["queue", "email", "error"],
					});
				}
			}
		}

		// For SMS channel, validate phone number before adding to queue
		if (notification && channelsToProcess.includes("sms")) {
			// Get recipient's phone number
			const recipient = await sqlClient.user.findUnique({
				where: { id: notification.recipientId },
				select: { phoneNumber: true },
			});

			const recipientPhone = recipient?.phoneNumber || null;

			// Skip if phone number is invalid or missing
			if (!isValidPhoneNumberForSms(recipientPhone)) {
				logger.info(
					"Skipping SMS notification - invalid or missing phone number",
					{
						metadata: {
							notificationId,
							recipientId: notification.recipientId,
							phoneNumber: recipientPhone
								? recipientPhone.replace(/\d(?=\d{4})/g, "*")
								: null, // Mask phone number in logs
						},
						tags: ["notification", "sms", "skip", "invalid-phone"],
					},
				);
				// Remove SMS from channels list to prevent processing
				channelsToProcess = channelsToProcess.filter((ch) => ch !== "sms");
			}
		}

		// For other channels, create delivery status records
		for (const channel of channelsToProcess) {
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

		// Check per-channel rate limit before contacting external providers
		const rateLimitCheck = await this.rateLimiter.checkRateLimit(
			channel,
			notification.storeId,
		);

		if (!rateLimitCheck.allowed) {
			const retryAfter = rateLimitCheck.retryAfter ?? 0;

			logger.warn("Notification processing rate-limited, deferring send", {
				metadata: {
					notificationId,
					channel,
					storeId: notification.storeId,
					retryAfter,
				},
				tags: ["rate-limit", "notification", "queue"],
			});

			// Keep status as pending but record rate-limit info for observability.
			await sqlClient.notificationDeliveryStatus.updateMany({
				where: {
					notificationId,
					channel,
					status: "pending",
				},
				data: {
					errorMessage: `Rate limited. Retry after ${retryAfter} seconds.`,
					updatedAt: getUtcNowEpoch(),
				},
			});

			return {
				success: false,
				channel,
				error: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
			};
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
			// Onsite: no store config => enabled. Email: no store config => use system emailEnabled
			if (channel === "onsite") return { enabled: true };
			if (channel === "email") {
				const sys = await sqlClient.systemNotificationSettings.findFirst();
				return {
					enabled: sys?.emailEnabled !== false,
				};
			}
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
