import { formatInTimeZone } from "date-fns-tz";

import { RsvpStatus } from "@/types/enum";
import { epochToDate } from "@/utils/datetime-utils";

export interface RsvpCalendarEventInput {
	storeName: string;
	storeTimezone: string;
	rsvpId: string;
	storeId: string;
	rsvpTime: bigint;
	durationMinutes: number;
	customerLabel: string;
	numOfAdult: number;
	numOfChild: number;
	message: string | null;
	facilityName: string | null;
	status: number;
	/** Physical address for ICS / Google template URL */
	location?: string;
}

/**
 * Builds Google Calendar API event resource for an RSVP.
 */
export function buildGoogleCalendarEventResource(
	input: RsvpCalendarEventInput,
) {
	const startUtc = epochToDate(input.rsvpTime);
	if (!startUtc) {
		throw new Error("Invalid rsvpTime for calendar event");
	}
	const endUtc = new Date(startUtc.getTime() + input.durationMinutes * 60_000);
	const tz = input.storeTimezone || "UTC";

	const startStr = formatInTimeZone(startUtc, tz, "yyyy-MM-dd'T'HH:mm:ss");
	const endStr = formatInTimeZone(endUtc, tz, "yyyy-MM-dd'T'HH:mm:ss");

	const party = input.numOfAdult + input.numOfChild;
	const summary = `${input.storeName} – ${input.customerLabel} – ${party} guest(s)`;

	const lines: string[] = [
		`RSVP ID: ${input.rsvpId}`,
		`Store: ${input.storeName}`,
	];
	if (input.facilityName) {
		lines.push(`Facility: ${input.facilityName}`);
	}
	if (input.message) {
		lines.push(`Note: ${input.message}`);
	}
	lines.push(`Status code: ${input.status}`);
	const description = lines.join("\n");

	const cancelled =
		input.status === RsvpStatus.Cancelled || input.status === RsvpStatus.NoShow;

	return {
		summary,
		description,
		...(input.location?.trim() ? { location: input.location.trim() } : {}),
		start: {
			dateTime: startStr,
			timeZone: tz,
		},
		end: {
			dateTime: endStr,
			timeZone: tz,
		},
		extendedProperties: {
			private: {
				rsvpId: input.rsvpId,
				storeId: input.storeId,
			},
		},
		status: cancelled ? ("cancelled" as const) : ("confirmed" as const),
	};
}

/**
 * Escapes text for ICS (RFC 5545).
 */
function escapeIcsText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}

function formatIcsUtc(dt: Date): string {
	return formatInTimeZone(dt, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Builds a minimal ICS document for customer download / universal calendars.
 */
export function buildRsvpIcsContent(input: RsvpCalendarEventInput): string {
	const startUtc = epochToDate(input.rsvpTime);
	if (!startUtc) {
		throw new Error("Invalid rsvpTime for ICS");
	}
	const endUtc = new Date(startUtc.getTime() + input.durationMinutes * 60_000);
	const uid = `${input.rsvpId}@riben.life`;
	const dtStamp = formatIcsUtc(new Date());

	const summary = escapeIcsText(`${input.storeName} – ${input.customerLabel}`);
	const desc = escapeIcsText(
		[
			`RSVP ID: ${input.rsvpId}`,
			input.facilityName ? `Facility: ${input.facilityName}` : "",
			input.message ? `Note: ${input.message}` : "",
		]
			.filter(Boolean)
			.join("\\n"),
	);
	const loc = input.location ? escapeIcsText(input.location) : "";

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Riben.Life//RSVP//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${dtStamp}`,
		`DTSTART:${formatIcsUtc(startUtc)}`,
		`DTEND:${formatIcsUtc(endUtc)}`,
		`SUMMARY:${summary}`,
		`DESCRIPTION:${desc}`,
		...(loc ? [`LOCATION:${loc}`] : []),
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

/**
 * Google Calendar "template" URL (no OAuth) for adding an event in the browser.
 */
export function buildGoogleCalendarTemplateUrl(
	input: RsvpCalendarEventInput,
): string {
	const startUtc = epochToDate(input.rsvpTime);
	if (!startUtc) {
		throw new Error("Invalid rsvpTime");
	}
	const endUtc = new Date(startUtc.getTime() + input.durationMinutes * 60_000);
	const text = encodeURIComponent(
		`${input.storeName} – ${input.customerLabel}`,
	);
	const details = encodeURIComponent(
		`RSVP ID: ${input.rsvpId}${input.facilityName ? `\nFacility: ${input.facilityName}` : ""}${input.message ? `\n${input.message}` : ""}`,
	);
	const loc = input.location ? encodeURIComponent(input.location) : "";
	const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
	const datesParam = `${formatInTimeZone(startUtc, "UTC", "yyyyMMdd'T'HHmmss'Z'")}/${formatInTimeZone(endUtc, "UTC", "yyyyMMdd'T'HHmmss'Z'")}`;
	return `${base}&text=${text}&dates=${encodeURIComponent(datesParam)}&details=${details}${loc ? `&location=${loc}` : ""}`;
}
