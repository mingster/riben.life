"use client";

import { useMemo, useState, useCallback } from "react";
import {
	format,
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	isSameDay,
	isBefore,
	startOfDay,
	addHours,
} from "date-fns";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, RsvpSettings, StoreSettings } from "@/types";
import {
	getDateInTz,
	getUtcNow,
	getOffsetHours,
	dayAndTimeSlotToUtc,
	epochToDate,
} from "@/utils/datetime-utils";

interface TimeRange {
	from: string;
	to: string;
}

interface WeeklySchedule {
	Monday: TimeRange[] | "closed";
	Tuesday: TimeRange[] | "closed";
	Wednesday: TimeRange[] | "closed";
	Thursday: TimeRange[] | "closed";
	Friday: TimeRange[] | "closed";
	Saturday: TimeRange[] | "closed";
	Sunday: TimeRange[] | "closed";
	holidays?: string[];
	timeZone?: string;
}

// Extract all unique hours from businessHours or rsvpHours JSON format
const extractHoursFromSchedule = (hoursJson: string | null): number[] => {
	if (!hoursJson) {
		return Array.from({ length: 14 }, (_, i) => i + 8);
	}

	try {
		const schedule = JSON.parse(hoursJson) as WeeklySchedule;
		const hours = new Set<number>();

		const days = [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		] as const;

		days.forEach((day) => {
			const dayHours = schedule[day];
			if (dayHours !== "closed" && Array.isArray(dayHours)) {
				dayHours.forEach((range: TimeRange) => {
					let fromHour = parseInt(range.from.split(":")[0], 10);
					let toHour = parseInt(range.to.split(":")[0], 10);
					const toMinutes = parseInt(range.to.split(":")[1] || "0", 10);

					if (toHour === 24) {
						toHour = 23;
					}
					if (fromHour === 24) {
						fromHour = 23;
					}

					const endHour = toMinutes > 0 ? toHour : toHour - 1;

					for (let hour = fromHour; hour <= endHour && hour < 24; hour++) {
						hours.add(hour);
					}
				});
			}
		});

		if (hours.size === 0) {
			return Array.from({ length: 14 }, (_, i) => i + 8);
		}

		return Array.from(hours).sort((a, b) => a - b);
	} catch {
		// If parsing fails, default to 8-22
		return Array.from({ length: 14 }, (_, i) => i + 8);
	}
};

// Generate time slots based on rsvpSettings and storeSettings
const generateTimeSlots = (
	useBusinessHours: boolean,
	rsvpHours: string | null,
	businessHours: string | null,
): string[] => {
	const hoursJson = useBusinessHours ? businessHours : rsvpHours;
	const hours = extractHoursFromSchedule(hoursJson);

	return hours.map((hour) => `${hour.toString().padStart(2, "0")}:00`);
};

// Group RSVPs by day and time slot
const groupRsvpsByDayAndTime = (
	rsvps: Rsvp[],
	weekStart: Date,
	weekEnd: Date,
	storeTimezone: string,
	currentRsvpId: string,
): Record<string, Rsvp[]> => {
	const grouped: Record<string, Rsvp[]> = {};
	const offsetHours = getOffsetHours(storeTimezone);

	rsvps.forEach((rsvp) => {
		// Exclude the current reservation being edited
		if (rsvp.id === currentRsvpId) return;

		if (!rsvp.rsvpTime) return;

		let rsvpDateUtc: Date;
		try {
			if (rsvp.rsvpTime instanceof Date) {
				rsvpDateUtc = rsvp.rsvpTime;
			} else if (typeof rsvp.rsvpTime === "bigint") {
				// BigInt epoch (milliseconds) - use epochToDate for proper UTC conversion
				rsvpDateUtc = epochToDate(rsvp.rsvpTime) ?? new Date();
			} else if (typeof rsvp.rsvpTime === "number") {
				// Number epoch (milliseconds) - after transformPrismaDataForJson
				rsvpDateUtc = epochToDate(BigInt(rsvp.rsvpTime)) ?? new Date();
			} else if (typeof rsvp.rsvpTime === "string") {
				rsvpDateUtc = new Date(rsvp.rsvpTime);
			} else {
				rsvpDateUtc = new Date(String(rsvp.rsvpTime));
			}

			// Validate the date
			if (isNaN(rsvpDateUtc.getTime())) {
				return;
			}
		} catch (error) {
			return;
		}

		const rsvpDate = getDateInTz(rsvpDateUtc, offsetHours);

		if (rsvpDate >= weekStart && rsvpDate <= weekEnd) {
			const dayKey = format(rsvpDate, "yyyy-MM-dd");
			const hour = rsvpDate.getHours();
			const timeKey = `${hour.toString().padStart(2, "0")}:00`;
			const key = `${dayKey}-${timeKey}`;

			if (!grouped[key]) {
				grouped[key] = [];
			}
			grouped[key].push(rsvp);
		}
	});

	return grouped;
};

// Check if a date is today (in store timezone)
// Note: This is for display comparison only, not for saving timestamps
const isToday = (date: Date, storeTimezone: string): boolean => {
	// Use getUtcNow() for consistency, then convert to store timezone for comparison
	const todayUtc = getUtcNow();
	const todayInStoreTz = getDateInTz(todayUtc, getOffsetHours(storeTimezone));
	return isSameDay(date, todayInStoreTz);
};

// Get day name abbreviation
const getDayName = (date: Date, t: (key: string) => string): string => {
	const dayOfWeek = date.getDay();
	const dayNames: Record<number, string> = {
		0: "weekday_Sunday",
		1: "weekday_Monday",
		2: "weekday_Tuesday",
		3: "weekday_Wednesday",
		4: "weekday_Thursday",
		5: "weekday_Friday",
		6: "weekday_Saturday",
	};
	return t(dayNames[dayOfWeek] || "weekday_Sunday");
};

interface SlotPickerProps {
	existingReservations: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	storeTimezone: string;
	currentRsvpId: string;
	selectedDateTime: Date | null;
	onSlotSelect: (dateTime: Date) => void;
}

export function SlotPicker({
	existingReservations,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	currentRsvpId,
	selectedDateTime,
	onSlotSelect,
}: SlotPickerProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const todayUtc = useMemo(() => getUtcNow(), []);
	const today = useMemo(
		() => startOfDay(getDateInTz(todayUtc, getOffsetHours(storeTimezone))),
		[todayUtc, storeTimezone],
	);

	const [currentWeek, setCurrentWeek] = useState(() => getUtcNow());

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;

	const timeSlots = useMemo(
		() => generateTimeSlots(useBusinessHours, rsvpHours, businessHours),
		[useBusinessHours, rsvpHours, businessHours],
	);

	const currentWeekInStoreTz = useMemo(
		() => getDateInTz(currentWeek, getOffsetHours(storeTimezone)),
		[currentWeek, storeTimezone],
	);

	const weekStart = useMemo(
		() => startOfWeek(currentWeekInStoreTz, { weekStartsOn: 0 }),
		[currentWeekInStoreTz],
	);
	const weekEnd = useMemo(
		() => endOfWeek(currentWeekInStoreTz, { weekStartsOn: 0 }),
		[currentWeekInStoreTz],
	);

	const isWeekInPast = useMemo(() => {
		// Compare weekStart (in store timezone) with today (in store timezone)
		return isBefore(startOfDay(weekStart), today);
	}, [weekStart, today]);

	const weekDays = useMemo(() => {
		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + i);
			days.push(date);
		}
		return days;
	}, [weekStart]);

	const groupedRsvps = useMemo(
		() =>
			groupRsvpsByDayAndTime(
				existingReservations,
				weekStart,
				weekEnd,
				storeTimezone,
				currentRsvpId,
			),
		[existingReservations, weekStart, weekEnd, storeTimezone, currentRsvpId],
	);

	const getRsvpsForSlot = useCallback(
		(day: Date, timeSlot: string): Rsvp[] => {
			const dayKey = format(day, "yyyy-MM-dd");
			const key = `${dayKey}-${timeSlot}`;
			return groupedRsvps[key] || [];
		},
		[groupedRsvps],
	);

	const handlePreviousWeek = useCallback(() => {
		setCurrentWeek((prev) => {
			const newWeek = subWeeks(prev, 1);
			const newWeekStart = startOfWeek(newWeek, { weekStartsOn: 0 });
			if (isBefore(startOfDay(newWeekStart), today)) {
				return prev;
			}
			return newWeek;
		});
	}, [today]);

	const handleNextWeek = useCallback(() => {
		setCurrentWeek((prev) => addWeeks(prev, 1));
	}, []);

	const handleToday = useCallback(() => {
		setCurrentWeek(getUtcNow());
	}, []);

	const handleSlotClick = useCallback(
		(day: Date, timeSlot: string) => {
			// Convert day + timeSlot to UTC Date using store timezone
			const dateInStoreTz = dayAndTimeSlotToUtc(day, timeSlot, storeTimezone);
			onSlotSelect(dateInStoreTz);
		},
		[onSlotSelect, storeTimezone],
	);

	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			{/* Week Navigation */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-1.5 sm:gap-2 font-mono text-sm flex-wrap">
					<Button
						variant="outline"
						size="icon"
						onClick={handlePreviousWeek}
						disabled={isWeekInPast}
						className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
					>
						<IconChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<Button
						variant="outline"
						onClick={handleToday}
						className="h-10 min-h-[44px] px-3 text-sm sm:h-9 sm:min-h-0"
					>
						{t("today")}
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={handleNextWeek}
						className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
					>
						<IconChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<span className="ml-2 text-base font-semibold sm:ml-4 sm:text-lg">
						<span className="hidden sm:inline">
							{format(weekStart, "MMMd")} - {format(weekEnd, "MMMd")}
						</span>
						<span className="sm:hidden">
							{format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
						</span>
					</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="border rounded-lg overflow-hidden">
				<div className="overflow-x-auto -mx-3 sm:mx-0">
					<table className="w-full border-collapse min-w-[320px] sm:min-w-full">
						<thead>
							<tr>
								<th className="w-10 sm:w-14 border-b border-r p-0.5 sm:p-1 text-right text-[9px] sm:text-xs font-medium text-muted-foreground sticky left-0 bg-background z-10">
									{t("time")}
								</th>
								{weekDays.map((day) => (
									<th
										key={day.toISOString()}
										className={cn(
											"border-b border-r p-0.5 sm:p-1 text-center text-[9px] sm:text-xs font-medium w-[36px] sm:min-w-[60px]",
											isToday(day, storeTimezone) && "bg-primary/10",
											"last:border-r-0",
										)}
									>
										<div className="flex flex-col">
											<span className="text-[8px] sm:text-[10px] text-muted-foreground">
												{getDayName(day, t)}
											</span>
											<span
												className={cn(
													"text-[10px] sm:text-sm font-semibold",
													isToday(day, storeTimezone) && "text-primary",
												)}
											>
												{format(day, "d")}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{timeSlots.map((timeSlot) => (
								<tr key={timeSlot}>
									<td className="border-b border-r p-0.5 sm:p-1 text-right text-[9px] sm:text-xs text-muted-foreground sticky left-0 bg-background z-10 whitespace-nowrap">
										{timeSlot}
									</td>
									{weekDays.map((day) => {
										const slotRsvps = getRsvpsForSlot(day, timeSlot);
										const isAvailable = slotRsvps.length === 0;
										// Extract hours and minutes from timeSlot for comparison
										const [hours, minutes] = timeSlot.split(":").map(Number);
										// Convert day + timeSlot to UTC for comparison
										const slotDateTimeUtc = dayAndTimeSlotToUtc(
											day,
											timeSlot,
											storeTimezone,
										);
										// Compare UTC times for accurate past/future check
										const isPast = isBefore(slotDateTimeUtc, todayUtc);
										const canSelect = isAvailable && !isPast;

										// Check if this slot is selected
										const isSelected = selectedDateTime
											? (() => {
													const selectedInStoreTz = getDateInTz(
														selectedDateTime,
														getOffsetHours(storeTimezone),
													);
													return (
														isSameDay(selectedInStoreTz, day) &&
														selectedInStoreTz.getHours() === hours &&
														selectedInStoreTz.getMinutes() === minutes
													);
												})()
											: false;

										return (
											<td
												key={`${day.toISOString()}-${timeSlot}`}
												className={cn(
													"border-b border-r p-0.5 w-[36px] sm:min-w-[60px] align-top",
													isToday(day, storeTimezone) && "bg-primary/5",
													"last:border-r-0",
												)}
											>
												{canSelect ? (
													<button
														type="button"
														onClick={() => handleSlotClick(day, timeSlot)}
														className={cn(
															"w-full h-full min-h-[32px] sm:min-h-[36px] rounded hover:bg-primary/10 active:bg-primary/20 transition-colors text-[10px] sm:text-xs touch-manipulation flex items-center justify-center",
															isSelected &&
																"bg-primary text-primary-foreground ring-1 ring-primary",
														)}
													>
														{isSelected ? "✓" : "+"}
													</button>
												) : (
													<div className="w-full h-full min-h-[32px] sm:min-h-[36px] flex items-center justify-center text-muted-foreground/50 text-[10px]">
														{isPast ? "" : "×"}
													</div>
												)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
