import { stripe } from "@better-auth/stripe";

import { passkey } from "@better-auth/passkey";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { emailHarmony } from "better-auth-harmony";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
	admin,
	anonymous,
	apiKey,
	bearer,
	magicLink,
	organization,
	phoneNumber,
	twoFactor,
} from "better-auth/plugins";

import { sendAuthMagicLink } from "@/actions/mail/send-auth-magic-link";
import { sendAuthPasswordReset } from "@/actions/mail/send-auth-password-reset";
import { stripe as stripeClient } from "@/lib/stripe/config";
import { linkAnonymousAccount } from "@/utils/account-linking";
import { customSession } from "better-auth/plugins";
import logger from "./logger";
import { sqlClient } from "./prismadb";

const options = {
	//...config options
	plugins: [],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
	baseURL:
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		(process.env.NODE_ENV === "production"
			? "https://riben.life"
			: "http://localhost:3001"),
	database: prismaAdapter(sqlClient, {
		provider: "postgresql", // or "mysql", "postgresql", ...etc
	}),
	roles: [
		{ name: "user" },
		{ name: "owner" },
		{ name: "staff" },
		{ name: "storeAdmin" },
		{ name: "admin" },
	],
	advanced: {
		cookies: {
			state: {
				attributes: {
					// In development, use lax to allow cookies on localhost
					// In production, use none with secure for cross-site OAuth
					sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
					secure: process.env.NODE_ENV === "production",
				},
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 365, // 365 days
		updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
	},
	account: {
		accountLinking: {
			enabled: true,
			allowDifferentEmails: true,
			trustedProviders: ["google", "line", "apple", "phone"],
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		account: {
			accountLinking: {
				enabled: true,
			},
		},
		sendResetPassword: async ({ user, url, token }, _request) => {
			await sendAuthPasswordReset(user.email, url);
		},
	},
	/* 
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url, token }, _request) => {
			await sendAuthEmailValidation(user.email, url);
		},
	},
  */
	socialProviders: {
		google: {
			clientId: process.env.AUTH_GOOGLE_ID as string,
			clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
			accessType: "offline",
			prompt: "select_account consent",
		},
		line: {
			clientId: process.env.AUTH_LINE_ID as string,
			clientSecret: process.env.AUTH_LINE_SECRET as string,
			scopes: ["openid", "profile", "email"],
		},
		apple: {
			clientId: process.env.AUTH_APPLE_ID as string,
			clientSecret: process.env.AUTH_APPLE_SECRET as string,
			// Optional
			appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER as string,
		},
	},
	trustedOrigins: ["https://appleid.apple.com", "https://riben.life"],
	plugins: [
		...(options.plugins ?? []),
		customSession(async ({ user, session }, ctx) => {
			// Include role and other user fields in the session
			const typedUser = user as any;
			const typedSession = session as any;

			return {
				user: {
					...typedUser,
					role: typedUser?.role || "user", // Ensure role is always present
				},
				session: {
					...typedSession,
					user: {
						...typedSession?.user,
						role: typedUser?.role || "user", // Include role in session.user
					},
				},
			};
		}, options),
		stripe({
			stripeClient,
			stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET as string,
			createCustomerOnSignUp: false,
			enabled: true,
			plans: async () => {
				const setting = await sqlClient.platformSettings.findFirst();
				if (!setting) {
					return [];
				}

				const pricesResponse = await stripeClient.prices
					.list({
						product: setting.stripeProductId as string,
					})
					.then((obj) => {
						return obj.data.map((price) => ({
							name: price.nickname,
							priceId: price.id,
							//limits: JSON.parse(price.metadata.limits),
							freeTrial: {
								days: price.metadata.freeTrial,
							},
							active: price.active,
							lookup_key: price.lookup_key,
							group: price.metadata.group,
						}));
					});
			},
		}),
		phoneNumber({
			sendOTP: async ({ phoneNumber, code }, ctx) => {
				// Normalize phone number format before sending SMS
				// Convert Taiwan numbers starting with +8860 to +886 (remove leading 0 after country code)
				// This ensures consistency between OTP storage and SMS sending
				let normalizedPhoneNumber = phoneNumber;
				if (normalizedPhoneNumber.startsWith("+8860")) {
					// Remove the leading 0 after +886 (e.g., +8860912345678 -> +886912345678)
					normalizedPhoneNumber = "+886" + normalizedPhoneNumber.slice(5);
				}

				// Better Auth provides the OTP code, we use our existing sendOTP function
				// which handles storing in database and sending via Twilio
				const { sendOTP } = await import("./otp/send-otp");
				const { getClientIP } = await import("@/utils/geo-ip");

				// Get locale from request context if available
				const locale =
					ctx?.request?.headers
						?.get("accept-language")
						?.split(",")[0]
						?.split("-")[0] || "tw";

				// Extract IP address from request headers for rate limiting
				const ipAddress = ctx?.request?.headers
					? (getClientIP(ctx.request.headers) ?? undefined)
					: undefined;

				// Extract user agent from request headers for logging
				const userAgent = ctx?.request?.headers?.get("user-agent") || undefined;

				// Call our existing sendOTP function with the normalized phone number
				// Note: Better Auth has already stored the OTP with the original phoneNumber format
				// So we need to ensure the frontend also normalizes before calling sendPhoneNumberOTP
				try {
					const result = await sendOTP({
						phoneNumber: normalizedPhoneNumber,
						locale,
						code, // Use the code provided by Better Auth
						ipAddress, // Pass IP address for rate limiting
						userAgent, // Pass user agent for logging
					});

					if (!result.success) {
						// Log the error with full details before throwing
						const logger = (await import("@/lib/logger")).default;
						logger.error("Better Auth sendOTP callback failed", {
							metadata: {
								phoneNumber: normalizedPhoneNumber.replace(/\d(?=\d{4})/g, "*"),
								error: result.error,
								locale,
							},
							tags: ["auth", "phone-otp", "error"],
						});

						// Throw error with full message
						const errorMessage = result.error || "Failed to send OTP";
						throw new Error(`SMS delivery failed: ${errorMessage}`);
					}
				} catch (error) {
					// Log the error with full details before re-throwing
					const logger = (await import("@/lib/logger")).default;
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error("Better Auth sendOTP callback exception", {
						metadata: {
							phoneNumber: normalizedPhoneNumber.replace(/\d(?=\d{4})/g, "*"),
							error: errorMessage,
							stack: error instanceof Error ? error.stack : undefined,
							locale,
						},
						tags: ["auth", "phone-otp", "error"],
					});

					// Re-throw with full error message
					throw new Error(
						`SMS delivery failed: ${errorMessage}`,
						error instanceof Error ? { cause: error } : undefined,
					);
				}
			},
			// No custom verifyOTP callback - Better Auth handles verification internally
			// When auth.api.verifyPhoneNumber is called, Better Auth will verify
			// the OTP against its own storage (created when sendPhoneNumberOTP was called)
			signUpOnVerification: {
				getTempEmail: (phoneNumber) => {
					// Generate temporary email for phone-based sign-up
					return `${phoneNumber.replace(/[^0-9]/g, "")}@phone.riben.life`;
				},
				getTempName: (phoneNumber) => {
					// Use masked phone number as temporary name
					return phoneNumber.replace(
						/(\+\d{1,3})(\d{3})(\d{3})(\d+)/,
						"$1$2***$4",
					);
				},
			},
		}),
		twoFactor(),
		magicLink({
			sendMagicLink: async ({ email, url, token }, _request) => {
				await sendAuthMagicLink(email, url);
			},
			expiresIn: 60 * 60 * 24, // 24 hours
		}),
		anonymous({
			generateRandomEmail: () => {
				const id = crypto.randomUUID();
				return `guest-${id}@riben.life`;
			},
			onLinkAccount: async ({ anonymousUser, newUser }) => {
				// Extract user IDs from the callback parameters
				// Better Auth passes user objects - handle both direct user object and nested structure
				const anonymousUserId =
					typeof anonymousUser === "object" && "id" in anonymousUser
						? anonymousUser.id
						: (anonymousUser as any).user?.id;
				const newUserId =
					typeof newUser === "object" && "id" in newUser
						? newUser.id
						: (newUser as any).user?.id;

				if (!anonymousUserId || !newUserId) {
					logger.error("Account linking failed: missing user IDs", {
						metadata: {
							anonymousUser: anonymousUser,
							newUser: newUser,
						},
						tags: ["auth", "anonymous", "account-linking", "error"],
					});
					return;
				}

				// Call utility function to handle account linking
				await linkAnonymousAccount(anonymousUserId, newUserId);
			},
			//emailDomainName: "riben.life", // -> temp-{id}@example.com
		}),
		bearer(),
		passkey(),
		apiKey(),
		emailHarmony(),
		/*
		captcha({
			provider: "google-recaptcha", // or cloudflare-turnstile, hcaptcha
			secretKey: process.env.RECAPTCHA_SECRET_KEY as string,
		}),
		*/
		organization(),
		admin({
			adminRoles: ["admin"],
			//adminUserIds: ["Nz6WKKKMKvadXXmgZgaHiqIYOuXr31w1"],
			//impersonationSessionDuration: 60 * 60 * 24, // 1 day
		}),
	],
	user: {
		additionalFields: {
			phoneNumber: {
				type: "string",
				required: false,
				defaultValue: "",
			},
			phoneNumberVerified: {
				type: "boolean",
				required: false,
				defaultValue: false,
			},
			role: {
				type: "string",
				required: false,
				defaultValue: "user",
				input: false, // don't allow user to set role
			},
			locale: {
				type: "string",
				required: false,
				defaultValue: "tw",
			},
			timezone: {
				type: "string",
				required: false,
				defaultValue: "",
			},
			stripeCustomerId: {
				type: "string",
				required: false,
				input: false, // don't allow user to set role
			},
		},
	},
});
export type Session = typeof auth.$Infer.Session;
