import { generateOTPCode, maskPhoneNumber } from "@/utils/utils";
import { knockClient } from "./client";
import logger from "@/lib/logger";
import { storeOTP } from "./otp-db";

export interface SendOTPParams {
	phoneNumber: string; // E.164 format
	userId?: string; // Optional, for existing users
}

export interface SendOTPResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

export async function sendOTP({
	phoneNumber,
	userId,
}: SendOTPParams): Promise<SendOTPResult> {
	const workflowKey = process.env.KNOCK_WORKFLOW_KEY || "phone-otp-tw";

	try {
		// Generate OTP code (6 digits)
		const otpCode = generateOTPCode();

		// Store OTP in database (expires in 10 minutes)
		await storeOTP(phoneNumber, otpCode, 10);

		// Trigger Knock workflow
		const result = await knockClient.workflows.trigger(workflowKey, {
			recipients: [phoneNumber],
			data: {
				otp_code: otpCode,
				phone_number: phoneNumber,
				expires_in_minutes: 10,
			},
		});

		logger.info("OTP sent via Knock", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				workflowRunId: result.workflow_run_id,
			},
			tags: ["knock", "otp", "send"],
		});

		return {
			success: true,
			messageId: result.workflow_run_id,
		};
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

		logger.error("Failed to send OTP via Knock", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				workflowKey,
				error: errorMessage,
			},
			tags: ["knock", "otp", "error"],
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
