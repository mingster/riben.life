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

	// Normalize phone number format
	// Convert Taiwan numbers starting with +8860 to +886 (remove leading 0 after country code)
	let normalizedPhoneNumber = phoneNumber;
	if (normalizedPhoneNumber.startsWith("+8860")) {
		// Remove the leading 0 after +886 (e.g., +8860912345678 -> +886912345678)
		normalizedPhoneNumber = "+886" + normalizedPhoneNumber.slice(5);
		logger.info("Normalized Taiwan phone number", {
			metadata: {
				original: maskPhoneNumber(phoneNumber),
				normalized: maskPhoneNumber(normalizedPhoneNumber),
			},
			tags: ["phone-auth", "otp-send", "normalization"],
		});
	}

	try {
		// Use provided code or generate a new one
		const otpCode = providedCode || generateOTPCode();

		// Note: When called from Better Auth's sendOTP callback, Better Auth
		// already stores the OTP in its own system. We just need to send it via SMS.

		// Check phone number country code to determine SMS provider
		const isTaiwanNumber = normalizedPhoneNumber.startsWith("+886");
		const isUSNumber = normalizedPhoneNumber.startsWith("+1");

		// Set locale to "tw" for Taiwan numbers, otherwise use provided locale or default
		const finalLocale = isTaiwanNumber ? "tw" : locale || "tw";

		// Get translation function for SMS message
		const { t } = await getT(finalLocale);

		// Get localized SMS message
		const smsMessage = t("otp_sms_message", { code: otpCode });

		if (isTaiwanNumber) {
			//#region Taiwan numbers

			// Send OTP via Mitake SMS for Taiwan numbers
			const { SmSend } = await import("@/lib/Mitake_SMS");

			const result = await SmSend({
				phoneNumber: normalizedPhoneNumber,
				message: smsMessage,
			});

			if (result.success) {
				// Log OTP send request to system_logs
				logger.info("OTP send request - SMS sent via Mitake", {
					metadata: {
						phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
						userId,
						locale,
						messageId: result.messageId,
						status: "success",
						provider: "mitake",
					},
					tags: ["phone-auth", "otp-send"],
					userId,
					ip: ipAddress,
					userAgent,
				});

				return {
					success: true,
					messageId: result.messageId,
				};
			} else {
				// Log OTP send failure
				logger.error("OTP send request - Mitake SMS failed", {
					metadata: {
						phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
						userId,
						error: result.error,
						statusCode: result.statusCode,
						statusMessage: result.statusMessage,
						status: "error",
						provider: "mitake",
					},
					tags: ["phone-auth", "otp-send"],
					userId,
					ip: ipAddress,
					userAgent,
				});

				return {
					success: false,
					error: result.error || "Failed to send OTP via Mitake SMS",
				};
			}
			//#endregion
		} else if (isUSNumber) {
			//#region US numbers
			// Send OTP via Twilio SMS for US/Canada numbers
			return await sendViaTwilio(
				normalizedPhoneNumber,
				smsMessage,
				locale,
				userId,
				ipAddress,
				userAgent,
			);
			//#endregion
		} else {
			// For other numbers, just log the OTP code (for development/testing)
			// Log OTP send request to system_logs
			logger.info(
				"OTP send request - code generated (unsupported country, log only)",
				{
					metadata: {
						phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
						code: otpCode,
						userId,
						locale,
						countryCode:
							normalizedPhoneNumber.match(/^\+\d{1,3}/)?.[0] || "unknown",
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
				phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
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

const sendViaTwilio = async (
	normalizedPhoneNumber: string,
	smsMessage: string,
	locale: string = "tw",
	userId?: string,
	ipAddress?: string,
	userAgent?: string,
): Promise<SendOTPResult> => {
	const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

	if (!twilioPhoneNumber) {
		const errorMessage =
			"TWILIO_PHONE_NUMBER environment variable is required for US numbers";
		logger.error("OTP send request - Twilio configuration missing", {
			metadata: {
				phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
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

	// Import Twilio client dynamically to avoid bundling issues
	const { twilioClient } = await import("@/lib/twilio/client");

	// Send OTP via Twilio SMS for US numbers
	const message = await twilioClient.messages.create({
		body: smsMessage,
		from: twilioPhoneNumber,
		to: normalizedPhoneNumber,
	});

	// Log OTP send request to system_logs
	logger.info("OTP send request - SMS sent via Twilio", {
		metadata: {
			phoneNumber: maskPhoneNumber(normalizedPhoneNumber),
			smsMessage,
			userId,
			locale,
			messageSid: message.sid,
			status: "success",
			provider: "twilio",
		},
		tags: ["phone-auth", "otp-send", "send-via-twilio"],
		userId,
		ip: ipAddress,
		userAgent,
	});

	return {
		success: true,
		messageId: message.sid,
	};
};
