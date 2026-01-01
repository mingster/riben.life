import logger from "@/lib/logger";
import { maskPhoneNumber } from "@/utils/utils";
import { auth } from "../auth";
import { headers } from "next/headers";
import { getClientIP } from "@/utils/geo-ip";

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
		const headersList = await headers();

		// Extract IP address and user agent for logging
		const ipAddress = getClientIP(headersList) ?? undefined;
		const userAgent = headersList.get("user-agent") || undefined;

		// Use Better Auth's verifyPhoneNumber API
		const result = await auth.api.verifyPhoneNumber({
			body: {
				phoneNumber: phoneNumber, // required
				code: code, // required
				disableSession: false,
				updatePhoneNumber: true,
			},
			headers: headersList,
		});

		// Check if verification was successful
		// Better Auth returns: { status: boolean, token: string | null, user: UserWithPhoneNumber }
		if (!result.status || !result.token) {
			// Log failed OTP verification attempt to system_logs
			logger.warn("OTP verification attempt - failed", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					codeLength: code.length,
					resultStatus: result.status,
					hasToken: !!result.token,
					status: "failed",
				},
				tags: ["phone-auth", "otp-verify"],
				userId: result.user?.id,
				ip: ipAddress,
				userAgent,
			});

			return {
				valid: false,
				error: "Invalid or expired OTP code. Please request a new code.",
			};
		}

		// Log successful OTP verification attempt to system_logs
		logger.info("OTP verification attempt - succeeded", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				status: "success",
			},
			tags: ["phone-auth", "otp-verify"],
			userId: result.user?.id,
			ip: ipAddress,
			userAgent,
		});

		return {
			valid: true,
		};
	} catch (error) {
		// Extract IP and user agent for logging (reuse headersList if available)
		let ipAddress: string | undefined;
		let userAgent: string | undefined;
		try {
			const headersList = await headers();
			ipAddress = getClientIP(headersList) ?? undefined;
			userAgent = headersList.get("user-agent") || undefined;
		} catch {
			// If headers() fails, continue without IP/userAgent
		}

		// Log OTP verification error to system_logs
		logger.error("OTP verification attempt - error", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				error: error instanceof Error ? error.message : String(error),
				status: "error",
			},
			tags: ["phone-auth", "otp-verify"],
			ip: ipAddress,
			userAgent,
		});

		return {
			valid: false,
			error: error instanceof Error ? error.message : "Failed to verify OTP",
		};
	}
}
