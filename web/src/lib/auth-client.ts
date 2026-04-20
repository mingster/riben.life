import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import {
	adminClient,
	anonymousClient,
	customSessionClient,
	//emailOTPClient,
	genericOAuthClient,
	inferAdditionalFields,
	magicLinkClient,
	//multiSessionClient,
	organizationClient,
	phoneNumberClient,
	//passkeyClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
	/** The base URL of the server (optional if you're using the same domain) */
	baseURL:
		typeof window !== "undefined"
			? window.location.origin
			: process.env.NEXT_PUBLIC_BASE_URL ||
				process.env.NEXT_PUBLIC_API_URL ||
				"",
	plugins: [
		inferAdditionalFields<typeof auth>(),
		customSessionClient<typeof auth>(),
		stripeClient({
			subscription: true, //if you want to enable subscription management
		}),
		organizationClient(),
		adminClient(),
		twoFactorClient(),
		magicLinkClient(),
		passkeyClient(),
		genericOAuthClient(),
		phoneNumberClient(),
		anonymousClient(),
		apiKeyClient(),
		/*
        emailOTPClient(),
        */
	],
});

/** Use these exports so all calls use the same plugin-enabled client instance. */
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;
export const linkSocial = authClient.linkSocial;

export type AuthClient = typeof authClient;
export type Session = AuthClient["$Infer"]["Session"]["session"];
export type User = AuthClient["$Infer"]["Session"]["user"];
