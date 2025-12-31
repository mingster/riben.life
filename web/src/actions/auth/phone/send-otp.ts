"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { headers } from "next/headers";
import logger from "@/lib/logger";

const sendOTPSchema = z.object({
	phoneNumber: z.string().min(1, "Phone number is required"),
});

export const sendOTPAction = baseClient
	.metadata({ name: "sendOTP" })
	.schema(sendOTPSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { phoneNumber } = parsedInput;

		// Normalize phone number to E.164 format
		const normalizedPhone = normalizePhoneNumber(phoneNumber);

		// Validate phone number format
		const isValid = validatePhoneNumber(normalizedPhone);
		if (!isValid) {
			return {
				serverError:
					"Invalid phone number format. Please use international format (e.g., +886912345678).",
			};
		}

		const headersList = await headers();

		try {
			// Use Better Auth's sendPhoneNumberOTP API
			// This will:
			// 1. Generate the OTP code
			// 2. Store it in Better Auth's system
			// 3. Call our sendOTP callback (configured in auth.ts) to send via Twilio
			const result = await auth.api.sendPhoneNumberOTP({
				body: {
					phoneNumber: normalizedPhone,
				},
				headers: headersList,
			});

			// Better Auth returns { message: string } on success
			// If there's an error, it will throw or return an error object
			if (!result || (result as any).error) {
				logger.error("Better Auth sendPhoneNumberOTP failed", {
					metadata: {
						phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
						result: result ? JSON.stringify(result) : "null",
					},
					tags: ["auth", "phone-otp", "error"],
				});

				return {
					serverError: "Failed to send OTP. Please try again later.",
				};
			}

			logger.info("OTP code sent successfully", {
				metadata: {
					phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
					result: result ? JSON.stringify(result) : "null",
				},
				tags: ["auth", "phone-otp", "success", "sendOTPAction"],
			});

			return {
				data: {
					success: true,
					message: "OTP code sent successfully.",
				},
			};
		} catch (error) {
			logger.error("Send OTP failed", {
				metadata: {
					phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["auth", "phone-otp", "error"],
			});

			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to send OTP. Please try again later.",
			};
		}
	});
