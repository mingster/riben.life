"use server";

import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getT } from "@/app/i18n";
import { SafeError } from "@/utils/error";
import { toEpochMsUnknown } from "@/utils/datetime-utils";

/**
 * Restaurant mode: total party headcount overlapping the proposed slot must stay under maxCapacity.
 * Counts all non-cancelled RSVPs for the store whose time windows overlap [rsvpStart, rsvpEnd).
 */
export async function validateRestaurantCapacity(params: {
	storeId: string;
	rsvpTimeUtc: Date;
	partyHeadcount: number;
	defaultDurationMinutes: number;
	maxCapacity: number;
}): Promise<void> {
	const {
		storeId,
		rsvpTimeUtc,
		partyHeadcount,
		defaultDurationMinutes,
		maxCapacity,
	} = params;

	if (maxCapacity <= 0 || partyHeadcount <= 0) {
		return;
	}

	const slotStart = rsvpTimeUtc.getTime();
	const slotEnd = slotStart + defaultDurationMinutes * 60 * 1000;

	const candidates = await sqlClient.rsvp.findMany({
		where: {
			storeId,
			status: { not: RsvpStatus.Cancelled },
			rsvpTime: { lt: BigInt(slotEnd) },
		},
		select: {
			rsvpTime: true,
			numOfAdult: true,
			numOfChild: true,
			Facility: { select: { defaultDuration: true } },
		},
	});

	let occupied = 0;
	for (const r of candidates) {
		const startMs = toEpochMsUnknown(r.rsvpTime);
		if (startMs === null) continue;
		const durMin =
			r.Facility?.defaultDuration != null
				? Number(r.Facility.defaultDuration)
				: defaultDurationMinutes;
		const endMs = startMs + durMin * 60 * 1000;
		if (slotStart < endMs && slotEnd > startMs) {
			occupied += (r.numOfAdult ?? 0) + (r.numOfChild ?? 0);
		}
	}

	if (occupied + partyHeadcount > maxCapacity) {
		const { t } = await getT();
		throw new SafeError(t("rsvp_fully_booked") || "That time is fully booked.");
	}
}
