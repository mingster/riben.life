import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";

/**
 * Store OTP code in database
 * @param phoneNumber - Phone number in E.164 format
 * @param code - OTP code (6 digits)
 * @param expiresInMinutes - Expiration time in minutes (default: 10)
 */
export async function storeOTP(
	phoneNumber: string,
	code: string,
	expiresInMinutes: number = 10,
): Promise<void> {
	const now = getUtcNowEpoch();
	const expiresAt = now + BigInt(expiresInMinutes * 60 * 1000);

	try {
		// Delete any existing OTP for this phone number
		await sqlClient.phoneOTP.deleteMany({
			where: { phoneNumber },
		});

		// Create new OTP record
		await sqlClient.phoneOTP.create({
			data: {
				phoneNumber,
				code,
				expiresAt,
				attempts: 0,
				createdAt: now,
			},
		});

		logger.info("OTP stored in database", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				expiresInMinutes,
			},
			tags: ["knock", "otp", "store"],
		});
	} catch (error) {
		logger.error("Failed to store OTP in database", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["knock", "otp", "error"],
		});
		throw error;
	}
}

/**
 * Verify OTP code against stored code
 * @param phoneNumber - Phone number in E.164 format
 * @param code - OTP code to verify
 * @returns true if valid, false otherwise
 */
export async function verifyOTP(
	phoneNumber: string,
	code: string,
): Promise<boolean> {
	try {
		const now = getUtcNowEpoch();

		// Find OTP record
		const otpRecord = await sqlClient.phoneOTP.findUnique({
			where: { phoneNumber },
		});

		if (!otpRecord) {
			logger.warn("OTP not found for phone number", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
				},
				tags: ["knock", "otp", "verify", "not-found"],
			});
			return false;
		}

		// Check if expired
		if (now > otpRecord.expiresAt) {
			// Delete expired OTP
			await sqlClient.phoneOTP.delete({
				where: { phoneNumber },
			});

			logger.warn("OTP expired", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
				},
				tags: ["knock", "otp", "verify", "expired"],
			});
			return false;
		}

		// Check attempt limit (max 5 attempts)
		if (otpRecord.attempts >= 5) {
			// Delete OTP after too many attempts
			await sqlClient.phoneOTP.delete({
				where: { phoneNumber },
			});

			logger.warn("OTP exceeded attempt limit", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					attempts: otpRecord.attempts,
				},
				tags: ["knock", "otp", "verify", "too-many-attempts"],
			});
			return false;
		}

		// Increment attempts
		await sqlClient.phoneOTP.update({
			where: { phoneNumber },
			data: {
				attempts: otpRecord.attempts + 1,
			},
		});

		// Verify code
		if (otpRecord.code === code) {
			// Delete OTP after successful verification
			await sqlClient.phoneOTP.delete({
				where: { phoneNumber },
			});

			logger.info("OTP verified successfully", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
				},
				tags: ["knock", "otp", "verify", "success"],
			});
			return true;
		}

		logger.warn("OTP code mismatch", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				attempts: otpRecord.attempts + 1,
			},
			tags: ["knock", "otp", "verify", "invalid"],
		});
		return false;
	} catch (error) {
		logger.error("Failed to verify OTP", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["knock", "otp", "verify", "error"],
		});
		return false;
	}
}

/**
 * Clean up expired OTP codes (run periodically via cron job)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
	try {
		const now = getUtcNowEpoch();

		const result = await sqlClient.phoneOTP.deleteMany({
			where: {
				expiresAt: {
					lt: now,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up expired OTPs", {
				metadata: {
					count: result.count,
				},
				tags: ["knock", "otp", "cleanup"],
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to cleanup expired OTPs", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["knock", "otp", "cleanup", "error"],
		});
		return 0;
	}
}

function maskPhoneNumber(phoneNumber: string): string {
	if (phoneNumber.length <= 4) return "****";
	return phoneNumber.slice(0, -4) + "****";
}
