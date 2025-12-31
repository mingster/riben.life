import { generateOTPCode, maskPhoneNumber } from "@/utils/utils";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

export interface SendOTPParams {
	phoneNumber: string; // E.164 format
	userId?: string; // Optional, for existing users
	locale?: string; // Optional locale for i18n (e.g., "en", "tw", "jp")
	code?: string; // Optional OTP code (if not provided, will be generated)
}

export interface SendOTPResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

export async function sendOTP({
	phoneNumber,
	userId,
	locale,
	code: providedCode,
}: SendOTPParams): Promise<SendOTPResult> {
	const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

	if (!twilioPhoneNumber) {
		const errorMessage = "TWILIO_PHONE_NUMBER environment variable is required";
		logger.error("Twilio configuration missing", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				error: errorMessage,
			},
			tags: ["twilio", "otp", "error"],
		});
		return {
			success: false,
			error: errorMessage,
		};
	}

	try {
		// Use provided code or generate a new one
		const otpCode = providedCode || generateOTPCode();

		// Note: When called from Better Auth's sendOTP callback, Better Auth
		// already stores the OTP in its own system. We just need to send it via SMS.

		// Get translation function for SMS message
		const { t } = await getT(locale || "tw");

		// Get localized SMS message
		const smsMessage = t("otp_sms_message", { code: otpCode });

		// Check if phone number is +1 (US/Canada) - only send via Twilio for +1
		const isUSNumber = phoneNumber.startsWith("+1");

		if (isUSNumber) {
			// Import Twilio client dynamically to avoid bundling issues
			const { twilioClient } = await import("@/lib/twilio/client");

			// Send OTP via Twilio SMS for US numbers
			const message = await twilioClient.messages.create({
				body: smsMessage,
				from: twilioPhoneNumber,
				to: phoneNumber,
			});

			logger.info("OTP sent via Twilio", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					smsMessage,
					userId,
					locale,
					messageSid: message.sid,
				},
				tags: ["twilio", "otp", "send"],
			});

			return {
				success: true,
				messageId: message.sid,
			};
		} else {
			// For non-US numbers, just log the OTP code (for development/testing)
			logger.info("OTP code generated (not sent via SMS - non-US number)", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					otpCode,
					smsMessage,
					userId,
					locale,
					countryCode: phoneNumber.match(/^\+\d{1,3}/)?.[0] || "unknown",
				},
				tags: ["otp", "send", "log-only"],
			});

			return {
				success: true,
				messageId: "log-only",
			};
		}
	} catch (error) {
		// Extract error message from various error formats
		let errorMessage = "Failed to send OTP";
		if (error instanceof Error) {
			errorMessage = error.message;
		} else if (typeof error === "string") {
			errorMessage = error;
		} else if (error && typeof error === "object" && "message" in error) {
			errorMessage = String(error.message);
		}

		logger.error("Failed to send OTP via Twilio", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				error: errorMessage,
				locale,
			},
			tags: ["twilio", "otp", "error"],
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
