import { getCalendarClientForConnection } from "./google-oauth-client";

export interface WritableGoogleCalendarOption {
	id: string;
	summary: string;
	primary: boolean;
}

export type ListWritableGoogleCalendarsOutcome =
	| { ok: true; calendars: WritableGoogleCalendarOption[] }
	| {
			ok: false;
			errorKind: "not_signed_up" | "unknown";
			message: string;
	  };

function extractGoogleApiErrorPayload(err: unknown): {
	reasons: string[];
	message: string;
} {
	const reasons: string[] = [];
	let message = "";

	if (err && typeof err === "object" && "response" in err) {
		const r = err as {
			response?: {
				data?: {
					error?: {
						message?: string;
						errors?: Array<{ reason?: string; message?: string }>;
					};
				};
			};
		};
		const errBody = r.response?.data?.error;
		message = errBody?.message ?? "";
		for (const e of errBody?.errors ?? []) {
			if (e.reason) {
				reasons.push(e.reason);
			}
		}
	}

	if (!message && err instanceof Error) {
		message = err.message;
	}
	if (!message) {
		message = String(err);
	}

	return { reasons, message };
}

function isUserNotSignedUpForCalendarError(err: unknown): boolean {
	const { reasons, message } = extractGoogleApiErrorPayload(err);
	return (
		reasons.includes("userNotSignedUp") ||
		message.includes("signed up for Google Calendar")
	);
}

/**
 * Fetches primary calendar metadata when calendarList is unavailable (fallback).
 */
async function fetchPrimaryCalendarOption(
	calendar: Awaited<ReturnType<typeof getCalendarClientForConnection>>,
): Promise<WritableGoogleCalendarOption | null> {
	const res = await calendar.calendars.get({ calendarId: "primary" });
	const data = res.data;
	if (!data.id) {
		return null;
	}
	return {
		id: data.id,
		summary: data.summary ?? data.id,
		primary: true,
	};
}

/**
 * Lists calendars the user can create events on (writer/owner), for RSVP sync target selection.
 * Falls back to `calendars.get(primary)` when `calendarList.list` fails (e.g. transient API issues).
 * Returns `not_signed_up` when Google reports the account has not enabled Calendar (open calendar.google.com once).
 */
export async function listWritableGoogleCalendarsForConnection(
	params: Parameters<typeof getCalendarClientForConnection>[0],
): Promise<ListWritableGoogleCalendarsOutcome> {
	const calendar = await getCalendarClientForConnection(params);

	try {
		const res = await calendar.calendarList.list({
			maxResults: 250,
		});

		const items = res.data.items ?? [];
		let calendars = items
			.filter(
				(item) =>
					Boolean(item.id) &&
					(item.accessRole === "owner" || item.accessRole === "writer"),
			)
			.map((item) => ({
				id: item.id as string,
				summary: item.summary ?? (item.id as string),
				primary: Boolean(item.primary),
			}));

		if (calendars.length === 0) {
			try {
				const primary = await fetchPrimaryCalendarOption(calendar);
				if (primary) {
					calendars = [primary];
				}
			} catch {
				// keep empty; user may lack writable calendars
			}
		}

		return { ok: true, calendars };
	} catch (listErr: unknown) {
		const { message } = extractGoogleApiErrorPayload(listErr);

		try {
			const primary = await fetchPrimaryCalendarOption(calendar);
			if (primary) {
				return { ok: true, calendars: [primary] };
			}
		} catch {
			// ignore; surface list error below
		}

		if (isUserNotSignedUpForCalendarError(listErr)) {
			return {
				ok: false,
				errorKind: "not_signed_up",
				message,
			};
		}

		return {
			ok: false,
			errorKind: "unknown",
			message,
		};
	}
}
