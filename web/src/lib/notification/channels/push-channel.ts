/**
 * Push Notification Channel Adapter
 * FCM/APNs push notifications
 */

import logger from "@/lib/logger";
import type {
	NotificationChannel,
	ChannelConfig,
	ValidationResult,
	DeliveryStatusInfo,
} from "../types";
import type { Notification } from "../types";
import type { NotificationChannelAdapter } from "./index";

export class PushChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "push";

	async send(
		notification: Notification,
		config: ChannelConfig,
	): Promise<{
		success: boolean;
		channel: NotificationChannel;
		messageId?: string;
		error?: string;
		deliveredAt?: bigint;
	}> {
		logger.info("Sending push notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "push"],
		});

		// TODO: Implement FCM/APNs integration
		// Support both Firebase Cloud Messaging (Android/iOS) and Apple Push Notification Service
		// const fcmClient = new FCM(config.credentials.fcmServerKey);
		// const result = await fcmClient.send({ to: deviceToken, notification: { title: notification.subject, body: notification.message } });

		return {
			success: false,
			channel: this.name,
			error: "Push channel not yet implemented",
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		const platform = config.settings?.platform || "fcm";

		if (platform === "fcm") {
			if (!config.credentials || !config.credentials.fcmServerKey) {
				return {
					valid: false,
					errors: ["FCM server key is required"],
				};
			}
		} else if (platform === "apns") {
			if (!config.credentials || !config.credentials.apnsKeyId) {
				return {
					valid: false,
					errors: ["APNs key ID is required"],
				};
			}
		}

		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		return {
			status: "sent",
			messageId,
		};
	}

	async isEnabled(storeId: string): Promise<boolean> {
		return false; // Placeholder
	}
}
