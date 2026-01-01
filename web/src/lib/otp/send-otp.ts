import { generateOTPCode, maskPhoneNumber } from "@/utils/utils";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";
import { checkRateLimit } from "@/utils/rate-limit";

export interface SendOTPParams {
	phoneNumber: string; // E.164 format
	userId?: string; // Optional, for existing users
	locale?: string; // Optional locale for i18n (e.g., "en", "tw", "jp")
	code?: string; // Optional OTP code (if not provided, will be generated)
	ipAddress?: string; // Optional IP address for rate limiting
	userAgent?: string; // Optional user agent for logging
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
	ipAddress,
	userAgent,
}: SendOTPParams): Promise<SendOTPResult> {
	// Check rate limiting before proceeding
	const rateLimitResult = await checkRateLimit({
		phoneNumber,
		ipAddress,
		locale,
	});

	if (!rateLimitResult.allowed) {
		// Log rate limit violation to system_logs
		logger.warn("OTP send request - rate limit exceeded", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				ipAddress,
				retryAfter: rateLimitResult.retryAfter,
				status: "rate-limit-exceeded",
			},
			tags: ["phone-auth", "otp-send", "rate-limit"],
			userId,
			ip: ipAddress,
			userAgent,
		});

		return {
			success: false,
			error:
				rateLimitResult.message || "Too many requests. Please try again later.",
		};
	}

	const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

	if (!twilioPhoneNumber) {
		const errorMessage = "TWILIO_PHONE_NUMBER environment variable is required";
		// Log OTP send failure to system_logs
		logger.error("OTP send request - configuration error", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				error: errorMessage,
				status: "error",
			},
			tags: ["phone-auth", "otp-send"],
			userId,
			ip: ipAddress,
			userAgent,
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

			// Log OTP send request to system_logs
			logger.info("OTP send request - SMS sent via Twilio", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					userId,
					locale,
					messageSid: message.sid,
					status: "success",
					provider: "twilio",
				},
				tags: ["phone-auth", "otp-send"],
				userId,
				ip: ipAddress,
				userAgent,
			});

			return {
				success: true,
				messageId: message.sid,
			};
		} else {
			// For non-US numbers, just log the OTP code (for development/testing)
			// Log OTP send request to system_logs
			logger.info(
				"OTP send request - code generated (non-US number, log only)",
				{
					metadata: {
						phoneNumber: maskPhoneNumber(phoneNumber),
						userId,
						locale,
						countryCode: phoneNumber.match(/^\+\d{1,3}/)?.[0] || "unknown",
						status: "success",
						provider: "log-only",
					},
					tags: ["phone-auth", "otp-send"],
					userId,
					ip: ipAddress,
					userAgent,
				},
			);

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

		// Log OTP send failure to system_logs
		logger.error("OTP send request - SMS delivery failed", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				error: errorMessage,
				locale,
				status: "error",
			},
			tags: ["phone-auth", "otp-send"],
			userId,
			ip: ipAddress,
			userAgent,
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
