/**
 * LINE Channel Adapter
 * LINE Messaging API integration
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

export class LineChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "line";

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
		logger.info("Sending LINE notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "line"],
		});

		// TODO: Implement LINE Messaging API integration
		// This would use the LINE Messaging API SDK
		// const lineClient = new LineClient(config.credentials.accessToken);
		// const result = await lineClient.pushMessage(userId, { type: 'text', text: notification.message });

		return {
			success: false,
			channel: this.name,
			error: "LINE channel not yet implemented",
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		if (!config.credentials || !config.credentials.accessToken) {
			return {
				valid: false,
				errors: ["LINE access token is required"],
			};
		}

		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		// TODO: Query LINE API for delivery status
		return {
			status: "sent",
			messageId,
		};
	}

	async isEnabled(storeId: string): Promise<boolean> {
		// Check if LINE is enabled for this store
		// This would query NotificationChannelConfig
		return false; // Placeholder
	}
}
