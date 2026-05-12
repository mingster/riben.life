"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { toBigIntEpochUnknown } from "@/utils/datetime-utils";
import { getRsvpConversationMessage } from "@/lib/reservation/conversation-utils";
import {
	buildGoogleCalendarTemplateUrl,
	buildRsvpIcsContent,
	type RsvpCalendarEventInput,
} from "@/lib/google-calendar/rsvp-calendar-event";

function buildCalendarInput(
	rsvp: Rsvp,
	storeTimezone: string,
	location?: string,
): RsvpCalendarEventInput | null {
	const rsvpTime = toBigIntEpochUnknown(rsvp.rsvpTime);
	if (rsvpTime === null) {
		return null;
	}
	const storeName = rsvp.Store?.name?.trim() || "Reservation";
	const tz = rsvp.Store?.defaultTimezone || storeTimezone || "Asia/Taipei";
	const durRaw =
		rsvp.Facility?.defaultDuration != null
			? Number(rsvp.Facility.defaultDuration)
			: 120;
	const durationMinutes = Number.isFinite(durRaw) && durRaw > 0 ? durRaw : 120;

	const customerLabel =
		rsvp.Customer?.name?.trim() ||
		rsvp.name?.trim() ||
		rsvp.Customer?.email?.trim() ||
		"Guest";

	return {
		storeName,
		storeTimezone: tz,
		rsvpId: rsvp.id,
		storeId: rsvp.storeId,
		rsvpTime,
		durationMinutes,
		customerLabel,
		numOfAdult: rsvp.numOfAdult,
		numOfChild: rsvp.numOfChild,
		message: getRsvpConversationMessage(rsvp),
		facilityName: rsvp.Facility?.facilityName ?? null,
		status: rsvp.status,
		location,
	};
}

interface RsvpCalendarExportButtonsProps {
	rsvp: Rsvp;
	storeTimezone: string;
	location?: string;
	googleLabel: string;
	icsLabel: string;
}

/**
 * Customer-facing: open Google Calendar template URL or download an ICS file.
 */
export function RsvpCalendarExportButtons({
	rsvp,
	storeTimezone,
	location,
	googleLabel,
	icsLabel,
}: RsvpCalendarExportButtonsProps) {
	const onDownloadIcs = useCallback(() => {
		const input = buildCalendarInput(rsvp, storeTimezone, location);
		if (!input) {
			return;
		}
		const ics = buildRsvpIcsContent(input);
		const blob = new Blob([ics], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `reservation-${rsvp.id}.ics`;
		a.click();
		URL.revokeObjectURL(url);
	}, [rsvp, storeTimezone, location]);

	if (rsvp.status === RsvpStatus.Cancelled) {
		return null;
	}

	const input = buildCalendarInput(rsvp, storeTimezone, location);
	if (!input) {
		return null;
	}

	let googleUrl: string;
	try {
		googleUrl = buildGoogleCalendarTemplateUrl(input);
	} catch {
		return null;
	}

	return (
		<div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1">
			<Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
				<a
					href={googleUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="touch-manipulation"
				>
					{googleLabel}
				</a>
			</Button>
			<Button
				type="button"
				variant="link"
				size="sm"
				className="h-auto p-0 text-xs touch-manipulation"
				onClick={onDownloadIcs}
			>
				{icsLabel}
			</Button>
		</div>
	);
}
