/**
 * SMS Channel Adapter
 * SMS provider abstraction (Twilio, AWS SNS, Vonage, etc.)
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { isValidPhoneNumberForSms } from "@/utils/phone-utils";
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

		try {
			// Get recipient's phone number
			const recipient = await sqlClient.user.findUnique({
				where: { id: notification.recipientId },
				select: { phoneNumber: true },
			});

			const recipientPhone = recipient?.phoneNumber || null;

			// Validate phone number
			if (!isValidPhoneNumberForSms(recipientPhone)) {
				const error = "Recipient phone number is invalid or missing";
				logger.warn("SMS notification skipped - invalid phone number", {
					metadata: {
						notificationId: notification.id,
						recipientId: notification.recipientId,
						phoneNumber: recipientPhone
							? recipientPhone.replace(/\d(?=\d{4})/g, "*")
							: null,
					},
					tags: ["channel", "sms", "validation"],
				});
				return {
					success: false,
					channel: this.name,
					error,
				};
			}

			// Get provider (default to twilio)
			const provider = config.settings?.provider || "twilio";

			if (provider === "twilio") {
				return await this.sendViaTwilio(notification, recipientPhone!, config);
			}

			// Other providers not yet implemented
			return {
				success: false,
				channel: this.name,
				error: `SMS provider '${provider}' is not yet implemented`,
			};
		} catch (error) {
			logger.error("Failed to send SMS notification", {
				metadata: {
					notificationId: notification.id,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["channel", "sms", "error"],
			});
			return {
				success: false,
				channel: this.name,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async sendViaTwilio(
		notification: Notification,
		to: string,
		config: ChannelConfig,
	): Promise<{
		success: boolean;
		channel: NotificationChannel;
		messageId?: string;
		error?: string;
		deliveredAt?: bigint;
	}> {
		try {
			// Get Twilio credentials from config or environment variables
			const accountSid =
				config.credentials?.accountSid || process.env.TWILIO_ACCOUNT_SID;
			const authToken =
				config.credentials?.authToken || process.env.TWILIO_AUTH_TOKEN;
			const fromNumber =
				config.settings?.fromNumber ||
				config.credentials?.fromNumber ||
				process.env.TWILIO_PHONE_NUMBER;

			if (!accountSid || !authToken) {
				const error = "Twilio credentials not configured";
				logger.error("SMS notification failed - Twilio not configured", {
					metadata: {
						notificationId: notification.id,
						error,
					},
					tags: ["channel", "sms", "twilio", "error"],
				});
				return {
					success: false,
					channel: this.name,
					error,
				};
			}

			if (!fromNumber) {
				const error = "Twilio phone number not configured";
				logger.error("SMS notification failed - Twilio phone number missing", {
					metadata: {
						notificationId: notification.id,
						error,
					},
					tags: ["channel", "sms", "twilio", "error"],
				});
				return {
					success: false,
					channel: this.name,
					error,
				};
			}

			// Import Twilio client dynamically to avoid bundling issues
			const twilio = await import("twilio");
			const twilioClient = twilio.default(accountSid, authToken);

			// Build SMS message (subject + message)
			const smsMessage = notification.subject
				? `${notification.subject}\n\n${notification.message}`
				: notification.message;

			// Send SMS via Twilio
			const message = await twilioClient.messages.create({
				body: smsMessage,
				from: fromNumber,
				to: to,
			});

			logger.info("SMS notification sent successfully via Twilio", {
				metadata: {
					notificationId: notification.id,
					messageSid: message.sid,
					to: to.replace(/\d(?=\d{4})/g, "*"), // Mask phone number
					status: message.status,
				},
				tags: ["channel", "sms", "twilio", "success"],
			});

			// Return success with message SID
			return {
				success: true,
				channel: this.name,
				messageId: message.sid,
				deliveredAt: getUtcNowEpoch(), // Twilio doesn't provide delivery timestamp immediately
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Failed to send SMS via Twilio", {
				metadata: {
					notificationId: notification.id,
					to: to.replace(/\d(?=\d{4})/g, "*"), // Mask phone number
					error: errorMessage,
				},
				tags: ["channel", "sms", "twilio", "error"],
			});
			return {
				success: false,
				channel: this.name,
				error: errorMessage,
			};
		}
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		const provider = config.settings?.provider || "twilio";

		if (provider === "twilio") {
			const errors: string[] = [];

			// Check if credentials are provided in config or environment variables
			const hasConfigCredentials =
				config.credentials?.accountSid && config.credentials?.authToken;
			const hasEnvCredentials =
				process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

			if (!hasConfigCredentials && !hasEnvCredentials) {
				errors.push(
					"Twilio Account SID and Auth Token are required (either in config or environment variables)",
				);
			}

			// Check for phone number
			const hasConfigPhoneNumber =
				config.settings?.fromNumber || config.credentials?.fromNumber;
			const hasEnvPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

			if (!hasConfigPhoneNumber && !hasEnvPhoneNumber) {
				errors.push(
					"Twilio phone number is required (either in config or TWILIO_PHONE_NUMBER environment variable)",
				);
			}

			if (errors.length > 0) {
				return {
					valid: false,
					errors,
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
		// Check if SMS channel is configured for the store
		// If no store-specific config, check environment variables
		if (!storeId) {
			// System-wide: check if Twilio is configured via environment variables
			return !!(
				process.env.TWILIO_ACCOUNT_SID &&
				process.env.TWILIO_AUTH_TOKEN &&
				process.env.TWILIO_PHONE_NUMBER
			);
		}

		// For store-specific config, this would be checked via ChannelConfig
		// when the channel adapter is called
		// For now, return true if environment variables are set
		return !!(
			process.env.TWILIO_ACCOUNT_SID &&
			process.env.TWILIO_AUTH_TOKEN &&
			process.env.TWILIO_PHONE_NUMBER
		);
	}
}
