import { sqlClient } from "@/lib/prismadb";

// https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest
async function refresh_google_token(googleAccount: any) {
	if (googleAccount.expires_at * 1000 < Date.now()) {
		//console.log(' do refresh_google_token ');

		// If the access token has expired, try to refresh it
		try {
			// https://accounts.google.com/.well-known/openid-configuration
			// We need the `token_endpoint`.
			const response = await fetch("https://oauth2.googleapis.com/token", {
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: process.env.AUTH_GOOGLE_ID!,
					client_secret: process.env.AUTH_GOOGLE_SECRET!,
					grant_type: "refresh_token",
					refresh_token: googleAccount.refresh_token,
				}),
				method: "POST",
			});

			const responseTokens = await response.json();

			if (!response.ok) throw responseTokens;

			await sqlClient.account.update({
				data: {
					access_token: responseTokens.access_token,
					expires_at: Math.floor(Date.now() / 1000 + responseTokens.expires_in),
					refresh_token:
						responseTokens.refresh_token ?? googleAccount.refresh_token,
				},
				where: {
					provider_providerAccountId: {
						provider: "google",
						providerAccountId: googleAccount.providerAccountId,
					},
				},
			});
			//console.log('access_token updated........');
		} catch (error) {
			console.error("Error refreshing access token", error);
			// The error property can be used client-side to handle the refresh token error
			//session.error = 'RefreshAccessTokenError';
		}
	}
}

export default refresh_google_token;
