import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { getCalendarClientForConnection } from "./google-oauth-client";
import { resolveRsvpCalendarTargetUserId } from "./resolve-calendar-target-user";
import {
	buildGoogleCalendarEventResource,
	type RsvpCalendarEventInput,
} from "./rsvp-calendar-event";

const DEFAULT_DURATION_MIN = 120;

async function deleteGoogleEventIfPossible(params: {
	storeId: string;
	targetUserId: string;
	googleCalendarId: string;
	googleEventId: string;
}): Promise<void> {
	const conn = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
		where: {
			storeId_userId: {
				storeId: params.storeId,
				userId: params.targetUserId,
			},
		},
	});
	if (!conn || conn.isInvalid) {
		return;
	}

	const calendar = await getCalendarClientForConnection({
		storeId: params.storeId,
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

	try {
		await calendar.events.delete({
			calendarId: params.googleCalendarId,
			eventId: params.googleEventId,
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (!msg.includes("404")) {
			logger.warn("Google Calendar event delete failed (non-404)", {
				metadata: {
					storeId: params.storeId,
					eventId: params.googleEventId,
					error: msg,
				},
				tags: ["google-calendar"],
			});
		}
	}
}

/**
 * Loads RSVP + relations and syncs to the resolved user's Google Calendar (if connected).
 */
export async function syncRsvpToGoogleCalendar(rsvpId: string): Promise<void> {
	const rsvp = await sqlClient.rsvp.findUnique({
		where: { id: rsvpId },
		include: {
			Store: {
				select: {
					id: true,
					name: true,
					ownerId: true,
					defaultTimezone: true,
				},
			},
			Customer: { select: { name: true, email: true } },
			Facility: { select: { facilityName: true, defaultDuration: true } },
		},
	});

	if (!rsvp?.Store) {
		logger.debug("syncRsvpToGoogleCalendar: RSVP or store missing", {
			metadata: { rsvpId },
			tags: ["google-calendar"],
		});
		return;
	}

	const store = rsvp.Store;
	const targetUserId = await resolveRsvpCalendarTargetUserId({
		storeId: store.id,
		ownerId: store.ownerId,
		serviceStaffId: rsvp.serviceStaffId,
	});

	let mapping = await sqlClient.rsvpGoogleCalendarEvent.findUnique({
		where: { rsvpId },
	});

	if (mapping && mapping.targetUserId !== targetUserId) {
		await deleteGoogleEventIfPossible({
			storeId: mapping.storeId,
			targetUserId: mapping.targetUserId,
			googleCalendarId: mapping.googleCalendarId,
			googleEventId: mapping.googleEventId,
		});
		await sqlClient.rsvpGoogleCalendarEvent.delete({ where: { rsvpId } });
		mapping = null;
	}

	const isCancelled = rsvp.status === RsvpStatus.Cancelled;

	if (isCancelled) {
		if (mapping) {
			await deleteGoogleEventIfPossible({
				storeId: mapping.storeId,
				targetUserId: mapping.targetUserId,
				googleCalendarId: mapping.googleCalendarId,
				googleEventId: mapping.googleEventId,
			});
		}
		await sqlClient.rsvpGoogleCalendarEvent.deleteMany({ where: { rsvpId } });
		return;
	}

	const connection = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
		where: {
			storeId_userId: { storeId: store.id, userId: targetUserId },
		},
	});

	if (!connection || connection.isInvalid) {
		logger.debug("syncRsvpToGoogleCalendar: no calendar connection for target user", {
			metadata: { rsvpId, storeId: store.id, targetUserId },
			tags: ["google-calendar"],
		});
		return;
	}

	const settings = await sqlClient.storeSettings.findUnique({
		where: { storeId: store.id },
		select: {
			streetLine1: true,
			city: true,
			district: true,
			province: true,
			postalCode: true,
		},
	});

	const locationParts = [
		settings?.streetLine1,
		[settings?.district, settings?.city].filter(Boolean).join(" "),
		settings?.province,
		settings?.postalCode,
	].filter((p) => p && String(p).trim() !== "");
	const locationStr =
		locationParts.length > 0 ? locationParts.join(", ") : undefined;

	const durationMinutes =
		rsvp.Facility?.defaultDuration != null
			? Number(rsvp.Facility.defaultDuration)
			: DEFAULT_DURATION_MIN;

	const customerLabel =
		rsvp.Customer?.name?.trim() ||
		rsvp.name?.trim() ||
		rsvp.Customer?.email?.trim() ||
		"Guest";

	const eventInput: RsvpCalendarEventInput = {
		storeName: store.name,
		storeTimezone: store.defaultTimezone || "Asia/Taipei",
		rsvpId: rsvp.id,
		storeId: store.id,
		rsvpTime: rsvp.rsvpTime,
		durationMinutes:
			Number.isFinite(durationMinutes) && durationMinutes > 0
				? durationMinutes
				: DEFAULT_DURATION_MIN,
		customerLabel,
		numOfAdult: rsvp.numOfAdult,
		numOfChild: rsvp.numOfChild,
		message: rsvp.message,
		facilityName: rsvp.Facility?.facilityName ?? null,
		status: rsvp.status,
		...(locationStr ? { location: locationStr } : {}),
	};

	const resource = buildGoogleCalendarEventResource(eventInput);
	const now = getUtcNowEpoch();

	const calendar = await getCalendarClientForConnection({
		storeId: store.id,
		googleCalendarId: connection.googleCalendarId,
		refreshTokenEnc: connection.refreshTokenEnc,
		accessToken: connection.accessToken,
		accessTokenExpiresAt: connection.accessTokenExpiresAt,
		updateTokens: async (data) => {
			await sqlClient.storeUserGoogleCalendarConnection.update({
				where: { id: connection.id },
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

	const currentMap = await sqlClient.rsvpGoogleCalendarEvent.findUnique({
		where: { rsvpId },
	});

	try {
		if (currentMap) {
			const updated = await calendar.events.patch({
				calendarId: connection.googleCalendarId,
				eventId: currentMap.googleEventId,
				requestBody: {
					...resource,
					...(locationStr ? { location: locationStr } : {}),
				},
			});
			await sqlClient.rsvpGoogleCalendarEvent.update({
				where: { rsvpId },
				data: {
					targetUserId,
					googleCalendarId: connection.googleCalendarId,
					googleEventId: updated.data?.id ?? currentMap.googleEventId,
					updatedAt: now,
				},
			});
		} else {
			const created = await calendar.events.insert({
				calendarId: connection.googleCalendarId,
				requestBody: {
					...resource,
					...(locationStr ? { location: locationStr } : {}),
				},
			});
			const eventId = created.data?.id;
			if (!eventId) {
				throw new Error("Google Calendar insert returned no event id");
			}
			await sqlClient.rsvpGoogleCalendarEvent.upsert({
				where: { rsvpId },
				create: {
					rsvpId,
					storeId: store.id,
					targetUserId,
					googleCalendarId: connection.googleCalendarId,
					googleEventId: eventId,
					createdAt: now,
					updatedAt: now,
				},
				update: {
					targetUserId,
					googleCalendarId: connection.googleCalendarId,
					googleEventId: eventId,
					updatedAt: now,
				},
			});
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error("Google Calendar RSVP sync failed", {
			metadata: { rsvpId, storeId: store.id, targetUserId, error: msg },
			tags: ["google-calendar", "error"],
		});
		if (
			msg.includes("401") ||
			msg.includes("403") ||
			msg.includes("invalid_grant")
		) {
			await sqlClient.storeUserGoogleCalendarConnection.update({
				where: { id: connection.id },
				data: { isInvalid: true, updatedAt: getUtcNowEpoch() },
			});
		}
	}
}

/**
 * Fire-and-forget sync from RSVP mutation paths (non-blocking).
 */
export function queueRsvpGoogleCalendarSync(rsvpId: string): void {
	void syncRsvpToGoogleCalendar(rsvpId).catch((err: unknown) => {
		logger.error("queueRsvpGoogleCalendarSync unhandled", {
			metadata: {
				rsvpId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["google-calendar", "error"],
		});
	});
}
