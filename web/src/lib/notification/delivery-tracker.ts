/**
 * Delivery Tracker
 * Monitors and tracks notification delivery status across all channels
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type { NotificationChannel, DeliveryStatus } from "./types";

export class DeliveryTracker {
	/**
	 * Update delivery status
	 */
	async updateStatus(
		notificationId: string,
		channel: NotificationChannel,
		status: DeliveryStatus,
		options?: {
			messageId?: string;
			deliveredAt?: bigint;
			readAt?: bigint;
			error?: string;
		},
	): Promise<void> {
		logger.info("Updating delivery status", {
			metadata: {
				notificationId,
				channel,
				status,
				messageId: options?.messageId,
			},
			tags: ["delivery", "track"],
		});

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
					status,
					messageId: options?.messageId || null,
					deliveredAt: options?.deliveredAt || null,
					readAt: options?.readAt || null,
					errorMessage: options?.error || null,
					updatedAt: getUtcNowEpoch(),
				},
			});
		} else {
			await sqlClient.notificationDeliveryStatus.create({
				data: {
					notificationId,
					channel,
					status,
					messageId: options?.messageId || null,
					deliveredAt: options?.deliveredAt || null,
					readAt: options?.readAt || null,
					errorMessage: options?.error || null,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
		}
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<void> {
		// Update on-site notification
		await sqlClient.messageQueue.update({
			where: { id: notificationId },
			data: {
				isRead: true,
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Update delivery status for channels that support read receipts
		const deliveryStatuses =
			await sqlClient.notificationDeliveryStatus.findMany({
				where: {
					notificationId,
					status: { in: ["sent", "delivered"] },
				},
			});

		for (const status of deliveryStatuses) {
			// Only update if channel supports read receipts
			// (e.g., email, LINE, WhatsApp support read receipts)
			if (["email", "line", "whatsapp", "telegram"].includes(status.channel)) {
				await this.updateStatus(
					notificationId,
					status.channel as NotificationChannel,
					"read",
					{
						readAt: getUtcNowEpoch(),
					},
				);
			}
		}
	}

	/**
	 * Get delivery status for a notification
	 */
	async getStatus(notificationId: string): Promise<
		Array<{
			channel: NotificationChannel;
			status: DeliveryStatus;
			messageId?: string;
			deliveredAt?: bigint;
			readAt?: bigint;
			error?: string;
		}>
	> {
		const deliveryStatuses =
			await sqlClient.notificationDeliveryStatus.findMany({
				where: { notificationId },
			});

		return deliveryStatuses.map((s) => ({
			channel: s.channel as NotificationChannel,
			status: s.status as DeliveryStatus,
			messageId: s.messageId || undefined,
			deliveredAt: s.deliveredAt || undefined,
			readAt: s.readAt || undefined,
			error: s.errorMessage || undefined,
		}));
	}

	/**
	 * Handle delivery callback from external service
	 */
	async handleDeliveryCallback(
		channel: NotificationChannel,
		messageId: string,
		status: DeliveryStatus,
		options?: {
			deliveredAt?: bigint;
			readAt?: bigint;
			error?: string;
		},
	): Promise<void> {
		logger.info("Handling delivery callback", {
			metadata: {
				channel,
				messageId,
				status,
			},
			tags: ["delivery", "callback"],
		});

		// Find notification by messageId
		const deliveryStatus = await sqlClient.notificationDeliveryStatus.findFirst(
			{
				where: {
					channel,
					messageId,
				},
			},
		);

		if (!deliveryStatus) {
			logger.warn("Delivery status not found for callback", {
				metadata: { channel, messageId },
				tags: ["delivery", "callback", "warning"],
			});
			return;
		}

		await this.updateStatus(deliveryStatus.notificationId, channel, status, {
			messageId,
			deliveredAt: options?.deliveredAt,
			readAt: options?.readAt,
			error: options?.error,
		});
	}
}
