/**
 * Email Channel Adapter
 * SMTP email delivery
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
		logger.info("Sending email notification", {
			metadata: { notificationId: notification.id },
			tags: ["channel", "email"],
		});

		// Email sending is handled by the email queue
		// This adapter is mainly for status tracking
		// Actual sending happens via EmailQueue processing

		return {
			success: true,
			channel: this.name,
			messageId: notification.id,
		};
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		// Email channel requires SMTP configuration
		if (!config.credentials || !config.credentials.smtpHost) {
			return {
				valid: false,
				errors: ["SMTP host is required"],
			};
		}

		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		// Email delivery status is tracked via EmailQueue
		// This would need to query the email queue or email service provider
		return {
			status: "sent",
			messageId,
		};
	}

	async isEnabled(storeId: string): Promise<boolean> {
		// Email is typically always enabled
		// But could check store settings
		return true;
	}
}
