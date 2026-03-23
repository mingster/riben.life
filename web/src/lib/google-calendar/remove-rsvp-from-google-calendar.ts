import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { getCalendarClientForConnection } from "./google-oauth-client";

/**
 * Deletes the Google Calendar event and mapping row before the RSVP row is removed.
 */
export async function removeRsvpFromGoogleCalendar(
	rsvpId: string,
): Promise<void> {
	const mapping = await sqlClient.rsvpGoogleCalendarEvent.findUnique({
		where: { rsvpId },
	});
	if (!mapping) {
		return;
	}

	const conn = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
		where: {
			storeId_userId: {
				storeId: mapping.storeId,
				userId: mapping.targetUserId,
			},
		},
	});

	if (conn && !conn.isInvalid) {
		try {
			const calendar = await getCalendarClientForConnection({
				storeId: mapping.storeId,
				googleCalendarId: conn.googleCalendarId,
				refreshTokenEnc: conn.refreshTokenEnc,
				accessToken: conn.accessToken,
				accessTokenExpiresAt: conn.accessTokenExpiresAt,
				updateTokens: async (data) => {
					await sqlClient.storeUserGoogleCalendarConnection.update({
						where: { id: conn.id },
						data: {
							accessToken: data.accessToken,
							accessTokenExpiresAt: data.accessTokenExpiresAt,
							...(data.refreshTokenEnc
								? { refreshTokenEnc: data.refreshTokenEnc }
								: {}),
							updatedAt: getUtcNowEpoch(),
						},
					});
				},
			});
			await calendar.events.delete({
				calendarId: mapping.googleCalendarId,
				eventId: mapping.googleEventId,
			});
		} catch (err: unknown) {
			logger.warn("removeRsvpFromGoogleCalendar: delete failed", {
				metadata: {
					rsvpId,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["google-calendar"],
			});
		}
	}

	await sqlClient.rsvpGoogleCalendarEvent.deleteMany({ where: { rsvpId } });
}
