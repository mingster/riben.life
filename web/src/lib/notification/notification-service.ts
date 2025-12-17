/**
 * Notification Service
 * Core service for creating, managing, and sending notifications
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type {
	CreateNotificationInput,
	Notification,
	DeliveryResult,
	BulkNotificationInput,
	BulkResult,
	NotificationStatus,
	NotificationChannel,
	DeliveryStatus,
} from "./types";
import { PreferenceManager } from "./preference-manager";
import { QueueManager } from "./queue-manager";
import { DeliveryTracker } from "./delivery-tracker";
import { TemplateEngine } from "./template-engine";

export class NotificationService {
	private preferenceManager: PreferenceManager;
	private queueManager: QueueManager;
	private deliveryTracker: DeliveryTracker;
	private templateEngine: TemplateEngine;

	constructor() {
		this.preferenceManager = new PreferenceManager();
		this.queueManager = new QueueManager();
		this.deliveryTracker = new DeliveryTracker();
		this.templateEngine = new TemplateEngine();
	}

	/**
	 * Create a new notification
	 */
	async createNotification(
		input: CreateNotificationInput,
	): Promise<Notification> {
		logger.info("Creating notification", {
			metadata: {
				senderId: input.senderId,
				recipientId: input.recipientId,
				storeId: input.storeId,
				notificationType: input.notificationType,
			},
			tags: ["notification", "create"],
		});

		// Check system-wide notification settings
		const systemSettings =
			await sqlClient.systemNotificationSettings.findFirst();
		if (systemSettings && !systemSettings.notificationsEnabled) {
			throw new Error("Notifications are disabled system-wide");
		}

		// Check if notification should be sent based on preferences
		const shouldSend = await this.preferenceManager.shouldSendNotification(
			input.recipientId,
			input.storeId || null,
			input.notificationType || null,
			input.channels || ["onsite", "email"],
		);

		if (!shouldSend.allowed) {
			logger.info("Notification blocked by preferences", {
				metadata: {
					recipientId: input.recipientId,
					storeId: input.storeId,
					reason: shouldSend.reason,
				},
				tags: ["notification", "preferences"],
			});
			throw new Error(`Notification blocked: ${shouldSend.reason}`);
		}

		// Render template if templateId is provided
		let subject = input.subject;
		let message = input.message;
		if (input.templateId) {
			const rendered = await this.templateEngine.render(
				input.templateId,
				input.recipientId, // Will resolve locale from user
				input.templateVariables || {},
			);
			subject = rendered.subject;
			message = rendered.body;
		}

		// Create notification record
		const notification = await sqlClient.messageQueue.create({
			data: {
				senderId: input.senderId,
				recipientId: input.recipientId,
				storeId: input.storeId || null,
				subject,
				message,
				notificationType: input.notificationType || null,
				actionUrl: input.actionUrl || null,
				priority: input.priority ?? 0,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
				isRead: false,
				isDeletedByAuthor: false,
				isDeletedByRecipient: false,
				sendTries: 0,
				sentOn: null,
			},
		});

		// Route to appropriate channels
		const channels = shouldSend.allowedChannels || input.channels || ["onsite"];
		await this.queueManager.addToQueue(notification.id, channels);

		// Prisma returns BigInt for createdAt/updatedAt, which matches our Notification interface
		return notification as unknown as Notification;
	}

	/**
	 * Send a notification immediately
	 */
	async sendNotification(notificationId: string): Promise<DeliveryResult[]> {
		logger.info("Sending notification", {
			metadata: { notificationId },
			tags: ["notification", "send"],
		});

		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new Error(`Notification not found: ${notificationId}`);
		}

		// Get channels to send to
		const channels = await this.queueManager.getQueuedChannels(notificationId);

		const results: DeliveryResult[] = [];

		for (const channel of channels) {
			try {
				const result = await this.queueManager.processNotification(
					notificationId,
					channel,
				);
				results.push(result);
			} catch (error) {
				logger.error("Failed to send notification", {
					metadata: {
						notificationId,
						channel,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["notification", "error"],
				});
				results.push({
					success: false,
					channel,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return results;
	}

	/**
	 * Send bulk notifications
	 */
	async sendBulkNotifications(
		input: BulkNotificationInput,
	): Promise<BulkResult> {
		logger.info("Sending bulk notifications", {
			metadata: {
				senderId: input.senderId,
				recipientCount: input.recipientIds.length,
				storeId: input.storeId,
			},
			tags: ["notification", "bulk"],
		});

		const results: BulkResult = {
			total: input.recipientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const recipientId of input.recipientIds) {
			try {
				const notification = await this.createNotification({
					...input,
					recipientId,
				});
				const deliveryResults = await this.sendNotification(notification.id);
				results.results.push({
					recipientId,
					result: deliveryResults,
				});
				if (deliveryResults.some((r) => r.success)) {
					results.successful++;
				} else {
					results.failed++;
				}
			} catch (error) {
				logger.error("Failed to send bulk notification", {
					metadata: {
						recipientId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["notification", "bulk", "error"],
				});
				results.failed++;
				results.results.push({
					recipientId,
					result: [
						{
							success: false,
							channel: "onsite" as NotificationChannel,
							error: error instanceof Error ? error.message : String(error),
						},
					],
				});
			}
		}

		return results;
	}

	/**
	 * Get notification status
	 */
	async getNotificationStatus(
		notificationId: string,
	): Promise<NotificationStatus> {
		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new Error(`Notification not found: ${notificationId}`);
		}

		const deliveryStatuses =
			await sqlClient.notificationDeliveryStatus.findMany({
				where: { notificationId },
			});

		const channels = deliveryStatuses.map((status) => ({
			channel: status.channel as NotificationChannel,
			status: status.status as DeliveryStatus,
			messageId: status.messageId || undefined,
			deliveredAt: status.deliveredAt || undefined,
			readAt: status.readAt || undefined,
			error: status.errorMessage || undefined,
		}));

		// Determine overall status
		let overallStatus: DeliveryStatus = "pending";
		if (channels.length === 0) {
			overallStatus = "pending";
		} else if (channels.some((c) => c.status === "failed")) {
			overallStatus = "failed";
		} else if (channels.some((c) => c.status === "read")) {
			overallStatus = "read";
		} else if (channels.some((c) => c.status === "delivered")) {
			overallStatus = "delivered";
		} else if (channels.some((c) => c.status === "sent")) {
			overallStatus = "sent";
		}

		return {
			notificationId,
			status: overallStatus,
			channels,
		};
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<void> {
		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new Error(`Notification not found: ${notificationId}`);
		}

		if (notification.recipientId !== userId) {
			throw new Error("User is not the recipient of this notification");
		}

		await sqlClient.messageQueue.update({
			where: { id: notificationId },
			data: {
				isRead: true,
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Update delivery status for channels that support read receipts
		await this.deliveryTracker.markAsRead(notificationId, userId);
	}

	/**
	 * Delete notification (soft delete)
	 */
	async deleteNotification(
		notificationId: string,
		userId: string,
		type: "sender" | "recipient",
	): Promise<void> {
		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new Error(`Notification not found: ${notificationId}`);
		}

		if (type === "sender" && notification.senderId !== userId) {
			throw new Error("User is not the sender of this notification");
		}

		if (type === "recipient" && notification.recipientId !== userId) {
			throw new Error("User is not the recipient of this notification");
		}

		const updateData: {
			isDeletedByAuthor?: boolean;
			isDeletedByRecipient?: boolean;
			updatedAt: bigint;
		} = {
			updatedAt: getUtcNowEpoch(),
		};

		if (type === "sender") {
			updateData.isDeletedByAuthor = true;
		} else {
			updateData.isDeletedByRecipient = true;
		}

		await sqlClient.messageQueue.update({
			where: { id: notificationId },
			data: updateData,
		});
	}
}

// Export singleton instance
export const notificationService = new NotificationService();
