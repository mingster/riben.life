"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { sendOTP } from "@/lib/knock/send-otp";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { checkRateLimit } from "@/utils/rate-limit";
import { headers } from "next/headers";

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

		// Get IP address from headers for rate limiting
		const headersList = await headers();
		const ipAddress =
			headersList.get("x-forwarded-for")?.split(",")[0] ||
			headersList.get("x-real-ip") ||
			"unknown";

		// Check rate limit
		const rateLimitResult = await checkRateLimit({
			phoneNumber: normalizedPhone,
			ipAddress,
		});

		if (!rateLimitResult.allowed) {
			return {
				serverError:
					rateLimitResult.message ||
					"Too many requests. Please try again later.",
			};
		}

		// Send OTP via Knock
		const result = await sendOTP({ phoneNumber: normalizedPhone });

		if (!result.success) {
			return {
				serverError:
					result.error || "Failed to send OTP. Please try again later.",
			};
		}

		return {
			data: {
				success: true,
				message: "OTP code sent successfully.",
			},
		};
	});
