import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { isSameDay } from "date-fns";

/** Sum (adults + children) for non-cancelled RSVPs overlapping [slotStartMs, slotEndMs) on the same store-local day. */
export function sumOverlappingPartyHeadcount(
	reservations: Rsvp[],
	slotStartMs: number,
	slotEndMs: number,
	defaultDurationFallback: number,
	storeTimezone: string,
): number {
	let sum = 0;
	const offset = getOffsetHours(storeTimezone);
	const slotDayInTz = getDateInTz(new Date(slotStartMs), offset);
	for (const rsvp of reservations) {
		if (rsvp.status === RsvpStatus.Cancelled || !rsvp.rsvpTime) {
			continue;
		}
		const rsvpDateUtc = epochToDate(rsvp.rsvpTime);
		if (!rsvpDateUtc) continue;
		const rsvpDayInTz = getDateInTz(rsvpDateUtc, offset);
		if (!isSameDay(rsvpDayInTz, slotDayInTz)) {
			continue;
		}
		const rsvpDur =
			rsvp.Facility?.defaultDuration != null
				? Number(rsvp.Facility.defaultDuration)
				: defaultDurationFallback;
		const rsvpStart = rsvpDateUtc.getTime();
		const rsvpEnd = rsvpStart + rsvpDur * 60 * 1000;
		if (slotStartMs < rsvpEnd && slotEndMs > rsvpStart) {
			sum += (rsvp.numOfAdult ?? 0) + (rsvp.numOfChild ?? 0);
		}
	}
	return sum;
}
