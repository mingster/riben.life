import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import {
	convertToUtc,
	dayAndTimeSlotToUtc,
	getOffsetHours,
	getDateInTz,
	toEpochMsUnknown,
} from "@/utils/datetime-utils";
import { getServiceStaffBusinessHours } from "@/utils/service-staff-schedule-utils";

type TimeRange = { from: string; to: string };
type WeeklySchedule = Record<
	| "Monday"
	| "Tuesday"
	| "Wednesday"
	| "Thursday"
	| "Friday"
	| "Saturday"
	| "Sunday",
	TimeRange[] | "closed" | undefined
>;

function slotsForDayFromHoursJson(
	hoursJson: string | null,
	calendarDate: Date,
	defaultDuration: number,
): string[] {
	if (!hoursJson) {
		const out: string[] = [];
		for (let hour = 8; hour < 22; hour++) {
			out.push(`${String(hour).padStart(2, "0")}:00`);
		}
		return out;
	}
	try {
		const schedule = JSON.parse(hoursJson) as WeeklySchedule;
		const slots = new Set<string>();
		const dayNames = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		] as const;
		const dayName = dayNames[calendarDate.getDay()];
		const dayHours = schedule[dayName];
		if (dayHours !== "closed" && Array.isArray(dayHours)) {
			for (const range of dayHours) {
				let currentHour = Number(range.from.split(":")[0]);
				let currentMin = Number(range.from.split(":")[1] || 0);
				const toHour = Number(range.to.split(":")[0]);
				const toMin = Number(range.to.split(":")[1] || 0);
				while (
					currentHour < toHour ||
					(currentHour === toHour && currentMin < toMin)
				) {
					slots.add(
						`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`,
					);
					currentMin += defaultDuration;
					if (currentMin >= 60) {
						currentHour += Math.floor(currentMin / 60);
						currentMin = currentMin % 60;
					}
				}
			}
		}
		return Array.from(slots).sort();
	} catch {
		return [];
	}
}

export async function GET(
	req: Request,
	context: { params: Promise<{ storeId: string }> },
) {
	const { storeId } = await context.params;
	const url = new URL(req.url);
	const dateStr = url.searchParams.get("date");
	const staffIdFilter = url.searchParams.get("staffId");

	if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return NextResponse.json(
			{ error: "date_required_yyyy_mm_dd" },
			{ status: 400 },
		);
	}

	const store = await sqlClient.store.findFirst({
		where: { id: storeId },
		select: { id: true, defaultTimezone: true },
	});
	if (!store) {
		return NextResponse.json({ error: "store_not_found" }, { status: 404 });
	}

	const tz = store.defaultTimezone || "Asia/Taipei";
	const noonUtc = convertToUtc(`${dateStr}T12:00`, tz);
	const calendarDate = getDateInTz(noonUtc, getOffsetHours(tz));

	const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
		where: { storeId },
		select: { defaultDuration: true },
	});
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60;

	const staffRows = await sqlClient.serviceStaff.findMany({
		where: { storeId, isDeleted: false },
		select: { id: true, defaultDuration: true },
	});

	const fromEpoch = dayAndTimeSlotToUtc(calendarDate, "00:00", tz).getTime();
	const toEpoch = dayAndTimeSlotToUtc(calendarDate, "23:59", tz).getTime();

	const overlappingRsvps = await sqlClient.rsvp.findMany({
		where: {
			storeId,
			rsvpTime: { gte: BigInt(fromEpoch), lte: BigInt(toEpoch) },
			status: { not: RsvpStatus.Cancelled },
			serviceStaffId: { not: null },
		},
		select: {
			serviceStaffId: true,
			rsvpTime: true,
			Facility: { select: { defaultDuration: true } },
		},
	});

	const result: { id: string; slots: string[] }[] = [];

	for (const s of staffRows) {
		if (staffIdFilter && s.id !== staffIdFilter) continue;

		const hoursJson = await getServiceStaffBusinessHours(
			storeId,
			s.id,
			null,
			calendarDate,
		);
		const dur = s.defaultDuration ? Number(s.defaultDuration) : defaultDuration;
		const allSlots = slotsForDayFromHoursJson(hoursJson, calendarDate, dur);
		const freeSlots = allSlots.filter((timeSlot) => {
			const start = dayAndTimeSlotToUtc(calendarDate, timeSlot, tz).getTime();
			const end = start + dur * 60 * 1000;
			for (const r of overlappingRsvps) {
				if (r.serviceStaffId !== s.id) continue;
				const rs = toEpochMsUnknown(r.rsvpTime);
				if (rs == null) continue;
				const rdur =
					r.Facility?.defaultDuration != null
						? Number(r.Facility.defaultDuration)
						: dur;
				const re = rs + rdur * 60 * 1000;
				if (start < re && end > rs) return false;
			}
			return true;
		});

		if (freeSlots.length > 0) {
			result.push({ id: s.id, slots: freeSlots });
		}
	}

	if (staffIdFilter && result.length === 0) {
		return NextResponse.json({
			date: dateStr,
			staffId: staffIdFilter,
			slots: [],
		});
	}

	if (staffIdFilter && result.length === 1) {
		return NextResponse.json({
			date: dateStr,
			staffId: staffIdFilter,
			slots: result[0]?.slots ?? [],
		});
	}

	return NextResponse.json({ date: dateStr, staff: result });
}
