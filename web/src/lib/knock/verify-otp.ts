import { verifyOTP as verifyStoredOTP } from "./otp-db";
import logger from "@/lib/logger";
import { maskPhoneNumber } from "@/utils/utils";

export interface VerifyOTPParams {
	phoneNumber: string; // E.164 format
	code: string; // 6-digit OTP code
}

export interface VerifyOTPResult {
	valid: boolean;
	error?: string;
}

export async function verifyOTP({
	phoneNumber,
	code,
}: VerifyOTPParams): Promise<VerifyOTPResult> {
	try {
		// Verify OTP against stored code in database
		const isValid = await verifyStoredOTP(phoneNumber, code);

		if (!isValid) {
			logger.warn("OTP verification failed", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					codeLength: code.length,
				},
				tags: ["knock", "otp", "verify", "failed"],
			});

			return {
				valid: false,
				error: "Invalid or expired OTP code. Please request a new code.",
			};
		}

		logger.info("OTP verification successful", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
			},
			tags: ["knock", "otp", "verify", "success"],
		});

		return {
			valid: true,
		};
	} catch (error) {
		logger.error("Failed to verify OTP", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["knock", "otp", "error"],
		});

		return {
			valid: false,
			error: error instanceof Error ? error.message : "Failed to verify OTP",
		};
	}
}
