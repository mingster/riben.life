"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { verifyOTP } from "@/lib/knock/verify-otp";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";

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

		// Verify OTP first (before checking user existence)
		const verifyResult = await verifyOTP({
			phoneNumber: normalizedPhone,
			code,
		});

		if (!verifyResult.valid) {
			return {
				serverError:
					verifyResult.error || "Invalid OTP code. Please try again.",
			};
		}

		// Check if phone number is registered
		const existingUser = await sqlClient.user.findFirst({
			where: { phoneNumber: normalizedPhone },
		});

		const headersList = await headers();
		const baseURL =
			process.env.NEXT_PUBLIC_BASE_URL ||
			process.env.NEXT_PUBLIC_API_URL ||
			(process.env.NODE_ENV === "production"
				? "https://riben.life"
				: "http://localhost:3001");

		try {
			// If user doesn't exist, sign up first
			if (!existingUser) {
				// Make HTTP request to Better Auth's phone sign-up endpoint
				const signUpResponse = await fetch(
					`${baseURL}/api/auth/phone/sign-up`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Cookie: headersList.get("cookie") || "",
						},
						body: JSON.stringify({
							phoneNumber: normalizedPhone,
							code,
						}),
					},
				);

				if (!signUpResponse.ok) {
					const errorData = await signUpResponse.json().catch(() => ({}));
					return {
						serverError:
							errorData.message ||
							"Failed to create account. Please try again.",
					};
				}
			}

			// Sign in (works for both new and existing users)
			const signInResponse = await fetch(`${baseURL}/api/auth/phone/sign-in`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: headersList.get("cookie") || "",
				},
				body: JSON.stringify({
					phoneNumber: normalizedPhone,
					code,
				}),
			});

			if (!signInResponse.ok) {
				const errorData = await signInResponse.json().catch(() => ({}));
				return {
					serverError:
						errorData.message || "Failed to sign in. Please try again.",
				};
			}

			// Get the session after sign in
			const session = await auth.api.getSession({
				headers: headersList,
			});

			return {
				data: {
					success: true,
					isNewUser: !existingUser,
					user: session?.user,
					session: session?.session,
				},
			};
		} catch (error) {
			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to authenticate. Please try again.",
			};
		}
	});
