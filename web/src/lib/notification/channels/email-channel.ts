/**
 * Email Channel Adapter
 * Adds emails to EmailQueue for asynchronous processing via SMTP
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { isFakeEmail } from "@/utils/email-utils";
import type {
	NotificationChannel,
	ChannelConfig,
	ValidationResult,
	DeliveryStatusInfo,
} from "../types";
import type { Notification } from "../types";
import type { NotificationChannelAdapter } from "./index";

export class EmailChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "email";

	async send(
		notification: Notification,
		_config: ChannelConfig,
	): Promise<{
		success: boolean;
		channel: NotificationChannel;
		messageId?: string;
		error?: string;
		deliveredAt?: bigint;
	}> {
		logger.info("Adding email notification to queue", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "email", "queue"],
		});

		try {
			// Get recipient's email address
			const recipient = await sqlClient.user.findUnique({
				where: { id: notification.recipientId },
				select: { email: true, name: true },
			});

			const recipientEmail = recipient?.email || null;
			const recipientName = recipient?.name || "";

			// Validate email address
			if (isFakeEmail(recipientEmail)) {
				const error = "Recipient email is fake/generated";
				logger.warn("Email notification skipped - fake/generated email", {
					metadata: {
						notificationId: notification.id,
						recipientId: notification.recipientId,
						email: recipientEmail,
					},
					tags: ["channel", "email", "validation"],
				});
				return {
					success: false,
					channel: this.name,
					error,
				};
			}

			if (!recipientEmail) {
				const error = "Recipient email address is missing";
				logger.warn("Email notification skipped - no email address", {
					metadata: {
						notificationId: notification.id,
						recipientId: notification.recipientId,
					},
					tags: ["channel", "email", "validation"],
				});
				return {
					success: false,
					channel: this.name,
					error,
				};
			}

			// Check if email is already in queue
			const existingEmail = await sqlClient.emailQueue.findFirst({
				where: {
					notificationId: notification.id,
					sentOn: null,
				},
			});

			if (existingEmail) {
				logger.info("Email already in queue", {
					metadata: {
						notificationId: notification.id,
						emailQueueId: existingEmail.id,
					},
					tags: ["channel", "email", "queue"],
				});
				return {
					success: true,
					channel: this.name,
					messageId: existingEmail.id,
				};
			}

			// Add email to queue
			const emailQueueItem = await sqlClient.emailQueue.create({
				data: {
					from: "no_reply@riben.life",
					fromName: notification.storeId
						? "Store Notification"
						: "System Notification",
					to: recipientEmail,
					toName: recipientName,
					subject: notification.subject,
					textMessage: notification.message,
					htmMessage: notification.message,
					createdOn: getUtcNowEpoch(),
					sendTries: 0,
					sentOn: null,
					storeId: notification.storeId,
					notificationId: notification.id,
					priority: notification.priority || 0,
				},
			});

			logger.info("Email added to queue successfully", {
				metadata: {
					notificationId: notification.id,
					emailQueueId: emailQueueItem.id,
					to: recipientEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
				},
				tags: ["channel", "email", "queue", "success"],
			});

			return {
				success: true,
				channel: this.name,
				messageId: emailQueueItem.id,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Failed to add email to queue", {
				metadata: {
					notificationId: notification.id,
					error: errorMessage,
				},
				tags: ["channel", "email", "queue", "error"],
			});
			return {
				success: false,
				channel: this.name,
				error: errorMessage,
			};
		}
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		// Email channel uses system SMTP configuration (environment variables)
		// No store-specific config validation needed
		// SMTP settings are configured via:
		// - EMAIL_SERVER_HOST
		// - EMAIL_SERVER_PORT
		// - EMAIL_SERVER_USER
		// - EMAIL_SERVER_PASSWORD
		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		// Check email queue status
		const emailQueueItem = await sqlClient.emailQueue.findUnique({
			where: { id: messageId },
			select: { sentOn: true, sendTries: true },
		});

		if (!emailQueueItem) {
			return {
				status: "failed",
				messageId,
				error: "Email queue item not found",
			};
		}

		if (emailQueueItem.sentOn) {
			return {
				status: "sent",
				messageId,
				deliveredAt: emailQueueItem.sentOn,
			};
		}

		if (emailQueueItem.sendTries >= 3) {
			return {
				status: "failed",
				messageId,
				error: "Maximum retry attempts reached",
			};
		}

		return {
			status: "pending",
			messageId,
		};
	}

	async isEnabled(storeId: string): Promise<boolean> {
		// Email is typically always enabled
		// Uses system SMTP configuration
		return true;
	}
}
