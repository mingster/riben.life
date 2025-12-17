/**
 * On-Site Channel Adapter
 * Real-time in-app notifications
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import type {
	NotificationChannel,
	ChannelConfig,
	ValidationResult,
	DeliveryStatusInfo,
} from "../types";
import type { Notification } from "../types";
import type { NotificationChannelAdapter } from "./index";

export class OnSiteChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "onsite";

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
		logger.info("Sending on-site notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "onsite"],
		});

		// On-site notifications are already created in the database
		// Just mark as sent
		await sqlClient.messageQueue.update({
			where: { id: notification.id },
			data: {
				sentOn: BigInt(Date.now()),
			},
		});

		// TODO: Push to real-time service for immediate delivery
		// This will be handled by the real-time service

		return {
			success: true,
			channel: this.name,
			messageId: notification.id,
			deliveredAt: BigInt(Date.now()),
		};
	}

	validateConfig(_config: ChannelConfig): ValidationResult {
		// On-site channel doesn't require configuration
		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: messageId },
		});

		if (!notification) {
			return {
				status: "failed",
				error: "Notification not found",
			};
		}

		return {
			status: notification.isRead ? "read" : "delivered",
			messageId: notification.id,
			deliveredAt: notification.sentOn || undefined,
			readAt: notification.isRead ? BigInt(Date.now()) : undefined,
		};
	}

	async isEnabled(_storeId: string): Promise<boolean> {
		// On-site notifications are always enabled
		return true;
	}
}
