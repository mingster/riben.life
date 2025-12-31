"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";
import logger from "@/lib/logger";

const signInOrUpPhoneSchema = z.object({
	phoneNumber: z.string().min(1, "Phone number is required"),
	code: z.string().length(6, "OTP code must be 6 digits"),
});

export const signInOrUpPhoneAction = baseClient
	.metadata({ name: "signInOrUpPhone" })
	.schema(signInOrUpPhoneSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { phoneNumber, code } = parsedInput;

		// Normalize phone number
		const normalizedPhone = normalizePhoneNumber(phoneNumber);

		// Validate phone number format
		const isValid = validatePhoneNumber(normalizedPhone);
		if (!isValid) {
			return {
				serverError: "Invalid phone number format.",
			};
		}

		const headersList = await headers();

		try {
			// Check if user exists before verification (to determine if it's a new user)
			const existingUser = await sqlClient.user.findFirst({
				where: { phoneNumber: normalizedPhone },
			});

			// Use Better Auth's internal API for phone verification
			// This is more reliable than HTTP endpoints and works with signUpOnVerification
			const verifyResult = await auth.api.verifyPhoneNumber({
				body: {
					phoneNumber: normalizedPhone,
					code,
					disableSession: false, // Create session after verification
					updatePhoneNumber: true, // Update phone number if session exists
				},
				headers: headersList,
			});

			// Check if verification was successful
			if (!verifyResult.status || !verifyResult.token) {
				logger.error("Better Auth phone verification failed", {
					metadata: {
						phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
						status: verifyResult.status,
						hasToken: !!verifyResult.token,
					},
					tags: ["auth", "phone-otp", "error"],
				});

				return {
					serverError: "Invalid or expired OTP code. Please try again.",
				};
			}

			// Get the session after verification
			const session = await auth.api.getSession({
				headers: headersList,
			});

			if (!session?.user) {
				return {
					serverError: "Failed to create session. Please try again.",
				};
			}

			return {
				data: {
					success: true,
					isNewUser: !existingUser,
					user: session.user,
					session: session.session,
				},
			};
		} catch (error) {
			logger.error("Sign in/up with phone failed", {
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
						: "Failed to authenticate. Please try again.",
			};
		}
	});
