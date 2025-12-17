/**
 * WhatsApp Channel Adapter
 * WhatsApp Business API integration
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

export class WhatsAppChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "whatsapp";

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
		logger.info("Sending WhatsApp notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "whatsapp"],
		});

		// TODO: Implement WhatsApp Business API integration
		// This would use the WhatsApp Business API SDK

		return {
			success: false,
			channel: this.name,
			error: "WhatsApp channel not yet implemented",
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		if (!config.credentials || !config.credentials.accessToken) {
			return {
				valid: false,
				errors: ["WhatsApp access token is required"],
			};
		}

		if (!config.settings || !config.settings.phoneNumberId) {
			return {
				valid: false,
				errors: ["WhatsApp phone number ID is required"],
			};
		}

		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		// TODO: Query WhatsApp API for delivery status
		return {
			status: "sent",
			messageId,
		};
	}

	async isEnabled(storeId: string): Promise<boolean> {
		return false; // Placeholder
	}
}
