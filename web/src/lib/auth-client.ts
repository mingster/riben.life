import { stripeClient } from "@better-auth/stripe/client";
import {
	adminClient,
	//anonymousClient,
	apiKeyClient,
	customSessionClient,
	//emailOTPClient,
	genericOAuthClient,
	inferAdditionalFields,
	magicLinkClient,
	//multiSessionClient,
	organizationClient,
	passkeyClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
	/** The base URL of the server (optional if you're using the same domain) */
	//baseURL: "http://localhost:3000"
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
		apiKeyClient(),

		/*
		emailOTPClient(),
		
		*/
	],
});
async function signInWithLINE() {
	const res = await authClient.signIn.social({ provider: "line" });
}

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	forgetPassword,
	resetPassword,
} = createAuthClient();

export type AuthClient = typeof authClient;
export type Session = AuthClient["$Infer"]["Session"]["session"];
export type User = AuthClient["$Infer"]["Session"]["user"];
