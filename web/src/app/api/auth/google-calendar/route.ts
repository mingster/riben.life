import { auth } from "@/lib/auth";
import {
	getAppBaseUrl,
	getGoogleCalendarRedirectUri,
} from "@/lib/google-calendar/google-env";
import { exchangeCodeForTokens } from "@/lib/google-calendar/google-oauth-client";
import { verifyGoogleCalendarOAuthState } from "@/lib/google-calendar/oauth-state";
import { encryptGoogleRefreshToken } from "@/lib/google-calendar/token-crypto";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Static Google OAuth callback URI for Calendar connect.
 * Store/user context is resolved from signed state payload.
 */
export async function GET(req: Request) {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const stateParam = url.searchParams.get("state");
	const oauthError = url.searchParams.get("error");

	if (!stateParam) {
		return new NextResponse("Missing state", { status: 400 });
	}

	const payload = verifyGoogleCalendarOAuthState(stateParam);
	if (!payload) {
		return new NextResponse("Invalid state", { status: 400 });
	}

	const storeId = payload.storeId;
	const settingsPath = `/storeAdmin/${storeId}/rsvp-settings?tab=googleCalendar`;

	if (oauthError) {
		logger.warn("Google Calendar OAuth error query", {
			metadata: { storeId, oauthError },
			tags: ["google-calendar"],
		});
		return NextResponse.redirect(`${getAppBaseUrl()}${settingsPath}&gc=error`);
	}

	if (!code) {
		return new NextResponse("Missing code", { status: 400 });
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const sessionUserId = session?.user?.id;
	if (typeof sessionUserId !== "string" || sessionUserId !== payload.userId) {
		return new NextResponse("Session mismatch", { status: 403 });
	}

	const redirectUri = getGoogleCalendarRedirectUri();
	let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
	try {
		tokens = await exchangeCodeForTokens({ code, redirectUri });
	} catch (err: unknown) {
		logger.error("Google token exchange failed", {
			metadata: {
				storeId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["google-calendar", "error"],
		});
		return NextResponse.redirect(
			`${getAppBaseUrl()}${settingsPath}&gc=token_error`,
		);
	}

	const refreshToken = tokens.refresh_token;
	if (!refreshToken) {
		logger.warn(
			"Google OAuth returned no refresh_token; user may need to revoke app and reconnect",
			{
				metadata: { storeId, userId: payload.userId },
				tags: ["google-calendar"],
			},
		);
		return NextResponse.redirect(
			`${getAppBaseUrl()}${settingsPath}&gc=no_refresh`,
		);
	}

	const now = getUtcNowEpoch();
	const refreshTokenEnc = encryptGoogleRefreshToken(refreshToken);
	const accessToken = tokens.access_token ?? null;
	const accessTokenExpiresAt = tokens.expiry_date
		? BigInt(tokens.expiry_date)
		: null;

	await sqlClient.storeUserGoogleCalendarConnection.upsert({
		where: {
			storeId_userId: { storeId, userId: payload.userId },
		},
		create: {
			storeId,
			userId: payload.userId,
			googleCalendarId: "primary",
			refreshTokenEnc,
			accessToken,
			accessTokenExpiresAt,
			isInvalid: false,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			googleCalendarId: "primary",
			refreshTokenEnc,
			accessToken,
			accessTokenExpiresAt,
			isInvalid: false,
			updatedAt: now,
		},
	});

	return NextResponse.redirect(
		`${getAppBaseUrl()}${settingsPath}&gc=connected`,
	);
}
