/**
 * SMS Channel Adapter
 * SMS provider abstraction (Twilio, AWS SNS, Vonage, etc.)
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

export class SmsChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "sms";

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
		logger.info("Sending SMS notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "sms"],
		});

		// TODO: Implement SMS provider integration
		// Support multiple providers: Twilio, AWS SNS, Vonage
		// const provider = config.settings?.provider || 'twilio';
		// const smsClient = getSmsProvider(provider, config.credentials);

		return {
			success: false,
			channel: this.name,
			error: "SMS channel not yet implemented",
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		const provider = config.settings?.provider || "twilio";

		if (provider === "twilio") {
			if (!config.credentials || !config.credentials.accountSid) {
				return {
					valid: false,
					errors: ["Twilio Account SID is required"],
				};
			}
			if (!config.credentials || !config.credentials.authToken) {
				return {
					valid: false,
					errors: ["Twilio Auth Token is required"],
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
