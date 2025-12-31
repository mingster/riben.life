"use server";

import logger from "@/lib/logger";
import { maskPhoneNumber } from "@/utils/utils";
import { auth } from "../auth";
import { headers } from "next/headers";

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
			logger.warn("OTP verification failed", {
				metadata: {
					phoneNumber: maskPhoneNumber(phoneNumber),
					codeLength: code.length,
					status: result.status,
					hasToken: !!result.token,
				},
				tags: ["otp", "verify", "failed"],
			});

			return {
				valid: false,
				error: "Invalid or expired OTP code. Please request a new code.",
			};
		}

		return {
			valid: true,
		};
	} catch (error) {
		logger.error("Failed to verify OTP", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["otp", "error"],
		});

		return {
			valid: false,
			error: error instanceof Error ? error.message : "Failed to verify OTP",
		};
	}
}
