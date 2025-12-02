"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
	format,
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	isSameDay,
	parseISO,
	Locale,
	isBefore,
	startOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, RsvpSettings, StoreSettings } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { ReservationDialog } from "./reservation-dialog";
import { EditReservationDialog } from "./edit-reservation-dialog";
import { getDateInTz, getUtcNow, getOffsetHours } from "@/utils/datetime-utils";

interface CustomerWeekViewCalendarProps {
	rsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	onTimeSlotClick?: (day: Date, timeSlot: string) => void;
	// Props for dialog
	storeId?: string;
	facilities?: Array<{
		id: string;
		facilityName: string;
		defaultCost: number | null;
	}>;
	user?: { id: string; email: string | null } | null;
	storeTimezone?: string;
	onReservationCreated?: (newRsvp: Rsvp) => void;
}

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
		// Default to 8-22 if no hours specified
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
					// Parse from time (e.g., "10:00" -> 10)
					let fromHour = parseInt(range.from.split(":")[0], 10);
					let toHour = parseInt(range.to.split(":")[0], 10);
					const toMinutes = parseInt(range.to.split(":")[1] || "0", 10);

					// Handle 24:00 as 23:00 (since hour 24 doesn't exist)
					if (toHour === 24) {
						toHour = 23;
					}
					if (fromHour === 24) {
						fromHour = 23;
					}

					// Include all hours from start (inclusive) to end
					// If end time has minutes (e.g., "13:30"), include the end hour
					// If end time is exact hour (e.g., "13:00"), don't include it (open until but not including)
					const endHour = toMinutes > 0 ? toHour : toHour - 1;

					for (let hour = fromHour; hour <= endHour && hour < 24; hour++) {
						hours.add(hour);
					}
				});
			}
		});

		// If no hours found, default to 8-22
		if (hours.size === 0) {
			return Array.from({ length: 14 }, (_, i) => i + 8);
		}

		return Array.from(hours).sort((a, b) => a - b);
	} catch (error) {
		// If parsing fails, default to 8-22
		console.error("Failed to parse hours JSON:", error);
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

// Get day name abbreviation using i18n
const getDayName = (date: Date, t: (key: string) => string): string => {
	const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
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

// Get day number
const getDayNumber = (date: Date): string => {
	return format(date, "d");
};

// Check if a date is today (in store timezone)
const isToday = (date: Date, storeTimezone: string): boolean => {
	const todayInStoreTz = getDateInTz(
		getUtcNow(),
		getOffsetHours(storeTimezone),
	);
	return isSameDay(date, todayInStoreTz);
};

// Group RSVPs by day and time slot
// RSVP dates are in UTC, convert to store timezone for display and grouping
const groupRsvpsByDayAndTime = (
	rsvps: Rsvp[],
	weekStart: Date,
	weekEnd: Date,
	storeTimezone: string,
) => {
	const grouped: Record<string, Rsvp[]> = {};
	// Convert IANA timezone string to offset hours
	const offsetHours = getOffsetHours(storeTimezone);

	rsvps.forEach((rsvp) => {
		if (!rsvp.rsvpTime) return;

		let rsvpDateUtc: Date;
		try {
			if (rsvp.rsvpTime instanceof Date) {
				rsvpDateUtc = rsvp.rsvpTime;
			} else if (typeof rsvp.rsvpTime === "string") {
				rsvpDateUtc = parseISO(rsvp.rsvpTime);
			} else {
				rsvpDateUtc = parseISO(String(rsvp.rsvpTime));
			}

			// Validate the date
			if (isNaN(rsvpDateUtc.getTime())) {
				console.warn("Invalid RSVP date:", rsvp.rsvpTime, rsvp.id);
				return;
			}
		} catch (error) {
			console.warn("Error parsing RSVP date:", rsvp.rsvpTime, rsvp.id, error);
			return;
		}

		// Convert UTC date to store timezone for display and grouping
		const rsvpDate = getDateInTz(rsvpDateUtc, offsetHours);

		// Check if RSVP is within the week (inclusive of boundaries)
		if (rsvpDate >= weekStart && rsvpDate <= weekEnd) {
			const dayKey = format(rsvpDate, "yyyy-MM-dd");
			// Round to nearest hour for time slot matching
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

export const CustomerWeekViewCalendar: React.FC<
	CustomerWeekViewCalendarProps
> = ({
	rsvps: initialRsvps,
	rsvpSettings,
	storeSettings,
	onTimeSlotClick,
	storeId,
	facilities = [],
	user,
	storeTimezone = "Asia/Taipei",
	onReservationCreated,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Convert UTC today to store timezone for display
	const todayUtc = useMemo(() => getUtcNow(), []);
	const today = useMemo(
		() => startOfDay(getDateInTz(todayUtc, getOffsetHours(storeTimezone))),
		[todayUtc, storeTimezone],
	);
	const [rsvps, setRsvps] = useState<Rsvp[]>(initialRsvps);
	const [currentWeek, setCurrentWeek] = useState(() => {
		// Always start with today to ensure we don't start on a past week
		// Use UTC for consistency, then convert to store timezone for display
		return getUtcNow();
	});

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;

	const timeSlots = useMemo(
		() => generateTimeSlots(useBusinessHours, rsvpHours, businessHours),
		[useBusinessHours, rsvpHours, businessHours],
	);

	// Map i18n language codes to date-fns locales
	const calendarLocale = useMemo((): Locale => {
		const localeMap: Record<string, Locale> = {
			tw: zhTW,
			en: enUS,
			jp: ja,
		};
		return localeMap[lng || "tw"] || zhTW;
	}, [lng]);

	// Convert currentWeek (which is in local time) to store timezone for week calculations
	const currentWeekInStoreTz = useMemo(
		() => getDateInTz(currentWeek, getOffsetHours(storeTimezone)),
		[currentWeek, storeTimezone],
	);

	const weekStart = useMemo(
		() => startOfWeek(currentWeekInStoreTz, { weekStartsOn: 0 }), // Sunday
		[currentWeekInStoreTz],
	);
	const weekEnd = useMemo(
		() => endOfWeek(currentWeekInStoreTz, { weekStartsOn: 0 }), // Saturday
		[currentWeekInStoreTz],
	);

	// Check if week start is before today
	const isWeekInPast = useMemo(
		() => isBefore(startOfDay(weekStart), today),
		[weekStart, today],
	);

	// Generate days of the week
	const weekDays = useMemo(() => {
		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + i);
			days.push(date);
		}
		return days;
	}, [weekStart]);

	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Show all RSVPs so users can see availability
	// User's own reservations will be editable via EditReservationDialog
	// Group RSVPs by day and time (convert UTC to store timezone)
	const groupedRsvps = useMemo(
		() => groupRsvpsByDayAndTime(rsvps, weekStart, weekEnd, storeTimezone),
		[rsvps, weekStart, weekEnd, storeTimezone],
	);

	// Helper to check if a reservation belongs to the current user
	const isUserReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (!user) return false;
			// Match by userId if both exist
			if (user.id && rsvp.userId) {
				return rsvp.userId === user.id;
			}
			// Match by email if userId doesn't match or is missing
			if (user.email && rsvp.User?.email) {
				return rsvp.User.email.toLowerCase() === user.email.toLowerCase();
			}
			return false;
		},
		[user],
	);

	const handlePreviousWeek = useCallback(() => {
		setCurrentWeek((prev) => {
			const newWeek = subWeeks(prev, 1);
			const newWeekStart = startOfWeek(newWeek, { weekStartsOn: 0 });
			// Don't allow navigation to past weeks
			if (isBefore(startOfDay(newWeekStart), today)) {
				return prev; // Stay on current week
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

	const getRsvpsForSlot = (day: Date, timeSlot: string): Rsvp[] => {
		const dayKey = format(day, "yyyy-MM-dd");
		const key = `${dayKey}-${timeSlot}`;
		return groupedRsvps[key] || [];
	};

	const handleTimeSlotClick = useCallback(
		(day: Date, timeSlot: string) => {
			onTimeSlotClick?.(day, timeSlot);
		},
		[onTimeSlotClick],
	);

	const handleReservationCreated = useCallback(
		(newRsvp: Rsvp) => {
			if (!newRsvp) return;
			setRsvps((prev) => {
				const exists = prev.some((item) => item.id === newRsvp.id);
				if (exists) return prev;
				return [newRsvp, ...prev];
			});
			onReservationCreated?.(newRsvp);
		},
		[onReservationCreated],
	);

	const handleReservationUpdated = useCallback((updatedRsvp: Rsvp) => {
		if (!updatedRsvp) return;
		setRsvps((prev) => {
			// Ensure rsvpTime is properly formatted as Date if it's a string
			const normalizedRsvp: Rsvp = {
				...updatedRsvp,
				rsvpTime:
					updatedRsvp.rsvpTime instanceof Date
						? updatedRsvp.rsvpTime
						: typeof updatedRsvp.rsvpTime === "string"
							? parseISO(updatedRsvp.rsvpTime)
							: new Date(updatedRsvp.rsvpTime),
			};

			const index = prev.findIndex((item) => item.id === normalizedRsvp.id);
			if (index === -1) {
				// If not found, add it (shouldn't happen, but handle gracefully)
				return [...prev, normalizedRsvp];
			}
			// Replace the existing RSVP with the updated one
			return prev.map((item) =>
				item.id === normalizedRsvp.id ? normalizedRsvp : item,
			);
		});
	}, []);

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
							{format(weekStart, "MMMd", { locale: calendarLocale })} -{" "}
							{format(weekEnd, datetimeFormat, { locale: calendarLocale })}
						</span>
						<span className="sm:hidden">
							{format(weekStart, "MMM d", { locale: calendarLocale })} -{" "}
							{format(weekEnd, "MMM d", { locale: calendarLocale })}
						</span>
					</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="border rounded-lg overflow-hidden">
				<div className="overflow-x-auto -mx-3 sm:mx-0">
					<table className="w-full border-collapse min-w-[390px] sm:min-w-full">
						<thead>
							<tr>
								<th className="w-12 sm:w-20 border-b border-r p-1 sm:p-2 text-right text-[10px] sm:text-sm font-medium text-muted-foreground sticky left-0 bg-background z-10">
									{t("time")}
								</th>
								{weekDays.map((day) => (
									<th
										key={day.toISOString()}
										className={cn(
											"border-b border-r p-0.5 sm:p-2 text-center text-[10px] sm:text-sm font-medium w-[48px] sm:min-w-[110px]",
											isToday(day, storeTimezone) && "bg-primary/10",
											"last:border-r-0",
										)}
									>
										<div className="flex flex-col">
											<span className="text-[9px] sm:text-xs text-muted-foreground">
												{getDayName(day, t)}
											</span>
											<span
												className={cn(
													"text-xs sm:text-lg font-semibold",
													isToday(day, storeTimezone) && "text-primary",
												)}
											>
												{getDayNumber(day)}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{timeSlots.map((timeSlot) => (
								<tr key={timeSlot}>
									<td className="border-b border-r p-1 sm:p-2 text-right text-[10px] sm:text-sm text-muted-foreground sticky left-0 bg-background z-10 whitespace-nowrap">
										{timeSlot}
									</td>
									{weekDays.map((day) => {
										const slotRsvps = getRsvpsForSlot(day, timeSlot);
										const isAvailable = slotRsvps.length === 0;
										// Check if this day/time slot is in the past
										// day is already in store timezone, compare with today in store timezone
										const [hours, minutes] = timeSlot.split(":").map(Number);
										const slotDateTime = new Date(day);
										slotDateTime.setHours(hours, minutes, 0, 0);
										const isPast = isBefore(slotDateTime, today);
										const canSelect = isAvailable && !isPast;
										return (
											<td
												key={`${day.toISOString()}-${timeSlot}`}
												className={cn(
													"border-b border-r p-0.5 sm:p-1 w-[48px] sm:min-w-[120px] align-top",
													isToday(day, storeTimezone) && "bg-primary/5",
													"last:border-r-0",
												)}
											>
												<div className="flex flex-col gap-0.5 sm:gap-1 min-h-[50px] sm:min-h-[60px]">
													{slotRsvps.length > 0 ? (
														slotRsvps.map((rsvp) => {
															const isPending =
																rsvp.status === RsvpStatus.Pending;
															const isUserOwnReservation =
																isUserReservation(rsvp);
															const canEdit =
																isPending && isUserOwnReservation && storeId;
															const rsvpCard = (
																<div
																	className={cn(
																		"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs min-h-[44px] touch-manipulation border-l-2",
																		rsvp.confirmedByStore
																			? "bg-green-50 dark:bg-green-950/20 border-l-green-500"
																			: "bg-yellow-50 dark:bg-yellow-950/20 border-l-yellow-500",
																		rsvp.alreadyPaid && "border-l-blue-500",
																		isUserOwnReservation &&
																			"ring-2 ring-primary/20",
																		canEdit &&
																			"cursor-pointer hover:opacity-80 active:opacity-70",
																	)}
																>
																	<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																		{rsvp.User?.name
																			? rsvp.User.name
																			: rsvp.User?.email
																				? rsvp.User.email
																				: `${rsvp.numOfAdult + rsvp.numOfChild} ${
																						rsvp.numOfAdult +
																							rsvp.numOfChild ===
																						1
																							? "guest"
																							: "guests"
																					}`}
																	</div>
																	{rsvp.Facility?.facilityName && (
																		<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																			{rsvp.Facility.facilityName}
																		</div>
																	)}
																	{rsvp.message && (
																		<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																			{rsvp.message}
																		</div>
																	)}
																</div>
															);

															return canEdit ? (
																<EditReservationDialog
																	key={rsvp.id}
																	storeId={storeId}
																	rsvpSettings={rsvpSettings}
																	facilities={facilities}
																	user={user}
																	rsvp={rsvp}
																	onReservationUpdated={
																		handleReservationUpdated
																	}
																	trigger={rsvpCard}
																/>
															) : (
																<div key={rsvp.id}>{rsvpCard}</div>
															);
														})
													) : isAvailable ? (
														storeId ? (
															<ReservationDialog
																storeId={storeId}
																rsvpSettings={rsvpSettings}
																facilities={facilities}
																user={user}
																defaultRsvpTime={(() => {
																	const [hours, minutes] = timeSlot
																		.split(":")
																		.map(Number);
																	const date = new Date(day);
																	date.setHours(hours, minutes, 0, 0);
																	return date;
																})()}
																onReservationCreated={handleReservationCreated}
																trigger={
																	<button
																		type="button"
																		disabled={isPast}
																		className={cn(
																			"w-full h-full min-h-[44px] sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground touch-manipulation flex items-center justify-center",
																			isPast && "cursor-not-allowed opacity-50",
																		)}
																	>
																		{!isPast && "+"}
																	</button>
																}
															/>
														) : (
															<button
																type="button"
																onClick={() =>
																	handleTimeSlotClick(day, timeSlot)
																}
																disabled={isPast}
																className={cn(
																	"w-full h-full min-h-[44px] sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground touch-manipulation flex items-center justify-center",
																	isPast && "cursor-not-allowed opacity-50",
																)}
															>
																{!isPast && "+"}
															</button>
														)
													) : null}
												</div>
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
};
