import { stripe } from "@better-auth/stripe";
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";

import { passkey } from "@better-auth/passkey";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { emailHarmony } from "better-auth-harmony";
import {
	admin,
	apiKey,
	bearer,
	magicLink,
	organization,
	twoFactor,
} from "better-auth/plugins";

import { sendAuthMagicLink } from "@/actions/mail/send-auth-magic-link";
import { sendAuthPasswordReset } from "@/actions/mail/send-auth-password-reset";
import { stripe as stripeClient } from "@/lib/stripe/config";
import { customSession } from "better-auth/plugins";
import { sqlClient } from "./prismadb";

const prisma = new PrismaClient();

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
	database: prismaAdapter(prisma, {
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
		sendResetPassword: async ({ user, url, token }, request) => {
			await sendAuthPasswordReset(user.email, url);
		},
	},
	/* 
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url, token }, request) => {
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

				// Call our existing sendOTP function with the code provided by Better Auth
				const result = await sendOTP({
					phoneNumber,
					locale,
					code, // Use the code provided by Better Auth
					ipAddress, // Pass IP address for rate limiting
					userAgent, // Pass user agent for logging
				});

				if (!result.success) {
					throw new Error(result.error || "Failed to send OTP");
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
			sendMagicLink: async ({ email, url, token }, request) => {
				await sendAuthMagicLink(email, url);
			},
			expiresIn: 60 * 60 * 24, // 24 hours
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
