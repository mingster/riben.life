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
	try {
		const workflowKey = process.env.KNOCK_WORKFLOW_KEY || "phone-otp-tw";

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
		logger.error("Failed to send OTP via Knock", {
			metadata: {
				phoneNumber: maskPhoneNumber(phoneNumber),
				userId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["knock", "otp", "error"],
		});

		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send OTP",
		};
	}
}
