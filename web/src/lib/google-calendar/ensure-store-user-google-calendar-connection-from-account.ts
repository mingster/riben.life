import {
	GOOGLE_CALENDAR_EVENTS_SCOPE,
	GOOGLE_CALENDAR_READONLY_SCOPE,
} from "@/lib/google-calendar/google-calendar-oauth-scopes";
import { sqlClient } from "@/lib/prismadb";
import { dateToEpoch, getUtcNowEpoch } from "@/utils/datetime-utils";

/**
 * RSVP Google sync reads `StoreUserGoogleCalendarConnection`, but `linkSocial` only
 * updates Better Auth `Account`. When the user has linked Google with Calendar scope
 * and a refresh token, mirror tokens into the per-(store, user) connection row.
 */
export async function ensureStoreUserGoogleCalendarConnectionFromAccount(
	storeId: string,
	userId: string,
): Promise<void> {
	const existing = await sqlClient.storeUserGoogleCalendarConnection.findUnique(
		{
			where: { storeId_userId: { storeId, userId } },
			select: { calendarSyncOptOut: true },
		},
	);
	if (existing?.calendarSyncOptOut) {
		return;
	}

	const account = await sqlClient.account.findFirst({
		where: { userId, providerId: "google" },
		select: {
			refreshToken: true,
			accessToken: true,
			accessTokenExpiresAt: true,
			scope: true,
		},
	});

	if (!account?.refreshToken || account.refreshToken.length === 0) {
		return;
	}

	const scopeParts = account.scope?.split(/\s+/).filter(Boolean) ?? [];
	const hasFullCalendarScope = scopeParts.some(
		(s) => s === "https://www.googleapis.com/auth/calendar",
	);
	const hasEventsScope = scopeParts.some(
		(s) =>
			s === GOOGLE_CALENDAR_EVENTS_SCOPE || s.includes("auth/calendar.events"),
	);
	const hasReadonlyScope = scopeParts.some(
		(s) =>
			s === GOOGLE_CALENDAR_READONLY_SCOPE ||
			s.includes("auth/calendar.readonly"),
	);
	/** Need events (or full calendar) for sync, and readonly (or full) for calendarList. */
	const canMirror =
		(hasEventsScope || hasFullCalendarScope) &&
		(hasReadonlyScope || hasFullCalendarScope);
	if (!canMirror) {
		return;
	}

	const accessTokenExpiresAt = dateToEpoch(account.accessTokenExpiresAt);
	const now = getUtcNowEpoch();

	await sqlClient.storeUserGoogleCalendarConnection.upsert({
		where: {
			storeId_userId: { storeId, userId },
		},
		create: {
			storeId,
			userId,
			googleCalendarId: "primary",
			refreshTokenEnc: account.refreshToken,
			accessToken: account.accessToken,
			accessTokenExpiresAt: accessTokenExpiresAt,
			isInvalid: false,
			calendarSyncOptOut: false,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			refreshTokenEnc: account.refreshToken,
			accessToken: account.accessToken,
			accessTokenExpiresAt: accessTokenExpiresAt,
			isInvalid: false,
			calendarSyncOptOut: false,
			updatedAt: now,
		},
	});
}
