/**
 * WeChat Channel Adapter
 * WeChat Official Account API integration
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

export class WeChatChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "wechat";

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
		logger.info("Sending WeChat notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "wechat"],
		});

		// TODO: Implement WeChat Official Account API integration

		return {
			success: false,
			channel: this.name,
			error: "WeChat channel not yet implemented",
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		if (!config.credentials || !config.credentials.appId) {
			return {
				valid: false,
				errors: ["WeChat App ID is required"],
			};
		}

		if (!config.credentials || !config.credentials.appSecret) {
			return {
				valid: false,
				errors: ["WeChat App Secret is required"],
			};
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
