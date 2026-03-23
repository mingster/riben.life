import { google } from "googleapis";

import {
	decryptGoogleRefreshToken,
	encryptGoogleRefreshToken,
} from "./token-crypto";
import { getGoogleCalendarRedirectUri } from "./google-env";

const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function getGoogleOAuth2Client(redirectUri: string) {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
	}
	return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleCalendarAuthorizeUrl(params: {
	redirectUri: string;
	state: string;
}): string {
	const oauth2 = getGoogleOAuth2Client(params.redirectUri);
	return oauth2.generateAuthUrl({
		access_type: "offline",
		prompt: "consent",
		scope: [CALENDAR_EVENTS_SCOPE],
		state: params.state,
		include_granted_scopes: true,
	});
}

export async function exchangeCodeForTokens(params: {
	code: string;
	redirectUri: string;
}): Promise<{
	access_token?: string | null;
	refresh_token?: string | null;
	expiry_date?: number | null;
}> {
	const oauth2 = getGoogleOAuth2Client(params.redirectUri);
	const { tokens } = await oauth2.getToken(params.code);
	return tokens;
}

/**
 * Returns a Calendar API client with a valid access token, refreshing if needed.
 * Persists new access token to DB when refreshed.
 */
export async function getCalendarClientForConnection(params: {
	storeId: string;
	googleCalendarId: string;
	refreshTokenEnc: string;
	accessToken: string | null;
	accessTokenExpiresAt: bigint | null;
	updateTokens: (data: {
		accessToken: string | null;
		accessTokenExpiresAt: bigint | null;
		refreshTokenEnc?: string;
	}) => Promise<void>;
}): Promise<ReturnType<typeof google.calendar>> {
	const redirectUri = getGoogleCalendarRedirectUri();
	const oauth2 = getGoogleOAuth2Client(redirectUri);
	const refresh = decryptGoogleRefreshToken(params.refreshTokenEnc);
	oauth2.setCredentials({
		refresh_token: refresh,
		access_token: params.accessToken ?? undefined,
		expiry_date:
			params.accessTokenExpiresAt !== null
				? Number(params.accessTokenExpiresAt)
				: undefined,
	});

	const calendar = google.calendar({ version: "v3", auth: oauth2 });

	// Proactively refresh if missing or near expiry
	const creds = oauth2.credentials;
	if (
		!creds.access_token ||
		!creds.expiry_date ||
		creds.expiry_date < Date.now() + 60_000
	) {
		const { credentials } = await oauth2.refreshAccessToken();
		oauth2.setCredentials(credentials);
		const accessToken = credentials.access_token ?? null;
		const expiryMs = credentials.expiry_date
			? BigInt(credentials.expiry_date)
			: null;
		let refreshEnc = params.refreshTokenEnc;
		if (credentials.refresh_token) {
			refreshEnc = encryptGoogleRefreshToken(credentials.refresh_token);
		}
		await params.updateTokens({
			accessToken,
			accessTokenExpiresAt: expiryMs,
			...(credentials.refresh_token ? { refreshTokenEnc: refreshEnc } : {}),
		});
	}

	return calendar;
}
