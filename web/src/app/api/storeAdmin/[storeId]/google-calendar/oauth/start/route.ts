import { NextResponse } from "next/server";

import {
	buildGoogleCalendarAuthorizeUrl,
} from "@/lib/google-calendar/google-oauth-client";
import { getGoogleCalendarRedirectUri } from "@/lib/google-calendar/google-env";
import {
	createOAuthNonce,
	signGoogleCalendarOAuthState,
} from "@/lib/google-calendar/oauth-state";
import { verifyGoogleCalendarStoreAccess } from "@/lib/google-calendar/verify-google-calendar-store-access";
import logger from "@/lib/logger";

/**
 * Redirects the browser to Google OAuth consent for Calendar events (offline access).
 */
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const { storeId } = await props.params;

	try {
		const access = await verifyGoogleCalendarStoreAccess(storeId);
		if (access instanceof NextResponse) {
			return access;
		}

		const state = signGoogleCalendarOAuthState({
			storeId,
			userId: access.userId,
			nonce: createOAuthNonce(),
		});

		const redirectUri = getGoogleCalendarRedirectUri(storeId);
		const url = buildGoogleCalendarAuthorizeUrl({ redirectUri, state });
		return NextResponse.redirect(url);
	} catch (err: unknown) {
		logger.error("Google Calendar OAuth start failed", {
			metadata: {
				storeId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["google-calendar", "error"],
		});
		return new NextResponse("Configuration error", { status: 500 });
	}
}
