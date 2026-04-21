/** Google OAuth scope for creating/updating calendar events (RSVP sync). */
export const GOOGLE_CALENDAR_EVENTS_SCOPE =
	"https://www.googleapis.com/auth/calendar.events";

/**
 * Read calendar metadata (required for `calendarList` — picking which calendar to sync).
 * `calendar.events` alone does not grant this; without it, list returns 403 insufficientPermissions.
 */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
	"https://www.googleapis.com/auth/calendar.readonly";

/** Scopes to request when linking Google for RSVP (dropdown + event sync). */
export const GOOGLE_CALENDAR_RSVP_LINK_SCOPES = [
	GOOGLE_CALENDAR_EVENTS_SCOPE,
	GOOGLE_CALENDAR_READONLY_SCOPE,
] as const;
