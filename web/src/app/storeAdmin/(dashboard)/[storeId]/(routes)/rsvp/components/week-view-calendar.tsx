"use client";

import {
	IconChevronLeft,
	IconChevronRight,
	IconCalendar,
} from "@tabler/icons-react";
import {
	format,
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	isSameDay,
	parseISO,
	Locale,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import {
	getUtcNow,
	epochToDate,
	getDateInTz,
	getOffsetHours,
	dayAndTimeSlotToUtc,
} from "@/utils/datetime-utils";
import { isWithinReservationTimeWindow } from "@/utils/rsvp-time-window-utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";

// Component for creating RSVP at specific time slot
interface CreateRsvpButtonProps {
	day: Date;
	timeSlot: string;
	onCreated?: (rsvp: Rsvp) => void;
	storeTimezone: string;
	rsvpSettings?: {
		prepaidRequired?: boolean | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		canReserveBefore?: number | null;
		canReserveAfter?: number | null;
	} | null;
}

const CreateRsvpButton: React.FC<CreateRsvpButtonProps> = ({
	day,
	timeSlot,
	onCreated,
	storeTimezone,
	rsvpSettings,
}) => {
	const [slotTime] = useState(() => {
		// day is already in store timezone (from getDateInTz)
		// Convert day + timeSlot to UTC Date using store timezone
		return dayAndTimeSlotToUtc(day, timeSlot, storeTimezone);
	});

	return (
		<AdminEditRsvpDialog
			isNew
			defaultRsvpTime={slotTime}
			onCreated={onCreated}
			storeTimezone={storeTimezone}
			rsvpSettings={rsvpSettings}
			trigger={
				<button
					type="button"
					className="w-full h-full sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground flex items-center justify-center"
				>
					+
				</button>
			}
		/>
	);
};

interface WeekViewCalendarProps {
	reservations: Rsvp[];
	onRsvpCreated?: (rsvp: Rsvp) => void;
	onRsvpUpdated?: (rsvp: Rsvp) => void;
	rsvpSettings: {
		useBusinessHours: boolean;
		rsvpHours: string | null;
		defaultDuration?: number | null;
		prepaidRequired?: boolean | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		canReserveBefore?: number | null;
		canReserveAfter?: number | null;
	} | null;
	storeSettings: { businessHours: string | null } | null;
	storeTimezone: string;
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
// Slots are generated at intervals based on defaultDuration (in minutes)
const generateTimeSlots = (
	useBusinessHours: boolean,
	rsvpHours: string | null,
	businessHours: string | null,
	defaultDuration: number = 60, // Default to 60 minutes (1 hour)
): string[] => {
	const hoursJson = useBusinessHours ? businessHours : rsvpHours;
	const hours = extractHoursFromSchedule(hoursJson);

	if (hours.length === 0) {
		return [];
	}

	const slots: string[] = [];
	const slotIntervalMinutes = defaultDuration;

	// Get the range of hours (from first to last hour)
	const minHour = Math.min(...hours);
	const maxHour = Math.max(...hours);

	// Generate slots starting from minHour:00, incrementing by defaultDuration
	// Continue until we've covered all hours in the range
	let currentMinutes = minHour * 60; // Start at minHour:00
	const maxMinutes = (maxHour + 1) * 60; // Go up to maxHour:59

	while (currentMinutes < maxMinutes) {
		const slotHour = Math.floor(currentMinutes / 60);
		const slotMin = currentMinutes % 60;

		// Only add slot if the hour is in our hours list
		// For slots that span multiple hours, check if any hour in the range is in our list
		const slotEndMinutes = currentMinutes + slotIntervalMinutes;
		const slotEndHour = Math.floor(slotEndMinutes / 60);

		// Check if this slot overlaps with any hour in our hours list
		const slotOverlaps = hours.some((h) => h >= slotHour && h <= slotEndHour);

		if (slotOverlaps && slotHour < 24) {
			slots.push(
				`${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`,
			);
		}

		// Move to next slot
		currentMinutes += slotIntervalMinutes;
	}

	// Remove duplicates and sort
	return Array.from(new Set(slots)).sort((a, b) => {
		const [aHour, aMin] = a.split(":").map(Number);
		const [bHour, bMin] = b.split(":").map(Number);
		if (aHour !== bHour) return aHour - bHour;
		return aMin - bMin;
	});
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

// Check if a date is today
// Note: This is for display comparison only, not for saving timestamps
const isToday = (date: Date): boolean => {
	// Use getUtcNow() for consistency, though this is just for comparison
	return isSameDay(date, getUtcNow());
};

// Group RSVPs by day and time slot
// RSVP times are in UTC epoch, convert to store timezone for display and grouping
// Match RSVPs to slots based on defaultDuration
const groupRsvpsByDayAndTime = (
	rsvps: Rsvp[],
	weekStart: Date,
	weekEnd: Date,
	storeTimezone: string,
	defaultDuration: number = 60, // Default to 60 minutes
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
			} else if (typeof rsvp.rsvpTime === "bigint") {
				// BigInt epoch (milliseconds)
				rsvpDateUtc = epochToDate(rsvp.rsvpTime) ?? new Date();
			} else if (typeof rsvp.rsvpTime === "number") {
				// Number epoch (milliseconds) - after transformPrismaDataForJson
				rsvpDateUtc = epochToDate(BigInt(rsvp.rsvpTime)) ?? new Date();
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
			// Round to nearest slot based on defaultDuration
			const totalMinutes = rsvpDate.getHours() * 60 + rsvpDate.getMinutes();
			const slotMinutes =
				Math.floor(totalMinutes / defaultDuration) * defaultDuration;
			const slotHour = Math.floor(slotMinutes / 60);
			const slotMin = slotMinutes % 60;
			const timeKey = `${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;
			const key = `${dayKey}-${timeKey}`;

			if (!grouped[key]) {
				grouped[key] = [];
			}
			grouped[key].push(rsvp);
		}
	});

	return grouped;
};

// admin view of WeekViewCalendar
export const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
	reservations,
	onRsvpCreated,
	onRsvpUpdated,
	rsvpSettings,
	storeSettings,
	storeTimezone,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [currentWeek, setCurrentWeek] = useState(() => getUtcNow());
	const [rsvps, setRsvps] = useState<Rsvp[]>(reservations);

	// Sync with prop changes (e.g., when server data is refreshed)
	useEffect(() => {
		setRsvps(reservations);
	}, [reservations]);

	// Handle RSVP updates locally
	const handleRsvpUpdated = useCallback(
		(updated: Rsvp) => {
			setRsvps((prev) =>
				prev.map((item) => (item.id === updated.id ? updated : item)),
			);
			onRsvpUpdated?.(updated);
		},
		[onRsvpUpdated],
	);

	// Handle RSVP creation locally
	const handleRsvpCreated = useCallback(
		(newRsvp: Rsvp) => {
			setRsvps((prev) => {
				const exists = prev.some((item) => item.id === newRsvp.id);
				if (exists) return prev;
				return [newRsvp, ...prev];
			});
			onRsvpCreated?.(newRsvp);
		},
		[onRsvpCreated],
	);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60; // Default to 60 minutes

	const timeSlots = useMemo(
		() =>
			generateTimeSlots(
				useBusinessHours,
				rsvpHours,
				businessHours,
				defaultDuration,
			),
		[useBusinessHours, rsvpHours, businessHours, defaultDuration],
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

	const weekStart = useMemo(
		() => startOfWeek(currentWeek, { weekStartsOn: 0 }), // Sunday
		[currentWeek],
	);
	const weekEnd = useMemo(
		() => endOfWeek(currentWeek, { weekStartsOn: 0 }), // Saturday
		[currentWeek],
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

	// Group RSVPs by day and time
	const groupedRsvps = useMemo(
		() =>
			groupRsvpsByDayAndTime(
				rsvps,
				weekStart,
				weekEnd,
				storeTimezone,
				defaultDuration,
			),
		[rsvps, weekStart, weekEnd, storeTimezone, defaultDuration],
	);

	const handlePreviousWeek = useCallback(() => {
		setCurrentWeek((prev) => subWeeks(prev, 1));
	}, []);

	const handleNextWeek = useCallback(() => {
		setCurrentWeek((prev) => addWeeks(prev, 1));
	}, []);

	const handleToday = useCallback(() => {
		setCurrentWeek(getUtcNow());
	}, []);

	const handleDateSelect = useCallback((date: Date | undefined) => {
		if (date) {
			setCurrentWeek(date);
		}
	}, []);

	const getRsvpsForSlot = (day: Date, timeSlot: string): Rsvp[] => {
		const dayKey = format(day, "yyyy-MM-dd");
		const key = `${dayKey}-${timeSlot}`;
		return groupedRsvps[key] || [];
	};

	// Use shared status color classes function
	const getStatusColorClasses = useCallback(
		(
			status: number | null | undefined,
			includeInteractions: boolean = true,
		): string => {
			return getRsvpStatusColorClasses(status, includeInteractions);
		},
		[],
	);
	const [dropdown, setDropdown] =
		useState<React.ComponentProps<typeof Calendar>["captionLayout"]>(
			"dropdown",
		);
	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			{/* Week Navigation */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-1.5 sm:gap-2 font-mono text-sm flex-wrap">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className={cn(
									"h-10 w-10 sm:h-9 sm:w-9",
									!currentWeek && "text-muted-foreground",
								)}
							>
								<IconCalendar className="h-4 w-4 sm:h-5 sm:w-5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[280px] sm:w-[320px] p-3"
							align="start"
						>
							<Calendar
								mode="single"
								selected={currentWeek}
								onSelect={handleDateSelect}
								captionLayout={dropdown}
								locale={calendarLocale}
								className="w-full rounded-lg shadow-sm"
								weekStartsOn={0}
							/>
						</PopoverContent>
					</Popover>

					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handlePreviousWeek}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={handleToday}
						className="h-10 px-3 text-sm sm:h-9"
					>
						{t("today")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleNextWeek}
						className="h-10 w-10 sm:h-9 sm:w-9"
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
											isToday(day) && "bg-primary/10",
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
													isToday(day) && "text-primary",
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
										return (
											<td
												key={`${day.toISOString()}-${timeSlot}`}
												className={cn(
													"border-b border-r p-0.5 sm:p-1 w-[48px] sm:min-w-[120px] align-top",
													isToday(day) && "bg-primary/5",
													"last:border-r-0",
												)}
											>
												<div className="flex flex-col gap-0.5 sm:gap-1 min-h-[50px] sm:min-h-[60px]">
													{slotRsvps.length > 0
														? slotRsvps.map((rsvp) => {
																const isCompleted =
																	rsvp.status === RsvpStatus.Completed;

																if (isCompleted) {
																	// Render as non-clickable button for completed RSVPs
																	return (
																		<button
																			key={rsvp.id}
																			type="button"
																			disabled
																			className={cn(
																				"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs transition-colors w-full cursor-default",
																				getStatusColorClasses(
																					rsvp.status,
																					false,
																				),
																			)}
																		>
																			<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																				{rsvp.Customer?.name
																					? rsvp.Customer.name
																					: rsvp.Customer?.email
																						? rsvp.Customer.email
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
																		</button>
																	);
																}

																// Render dialog for non-completed RSVPs
																return (
																	<AdminEditRsvpDialog
																		key={rsvp.id}
																		rsvp={rsvp}
																		onUpdated={handleRsvpUpdated}
																		storeTimezone={storeTimezone}
																		rsvpSettings={rsvpSettings}
																		trigger={
																			<button
																				type="button"
																				className={cn(
																					"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs transition-colors",
																					getStatusColorClasses(rsvp.status),
																				)}
																			>
																				<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																					{rsvp.Customer?.name
																						? rsvp.Customer.name
																						: rsvp.Customer?.email
																							? rsvp.Customer.email
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
																			</button>
																		}
																	/>
																);
															})
														: (() => {
																// Check if this time slot is within the reservation window
																const slotTimeUtc = dayAndTimeSlotToUtc(
																	day,
																	timeSlot,
																	storeTimezone,
																);
																const isWithinWindow =
																	isWithinReservationTimeWindow(
																		rsvpSettings,
																		slotTimeUtc,
																	);

																if (!isWithinWindow) {
																	// Slot is outside the allowed window - show disabled state
																	return (
																		<button
																			type="button"
																			disabled
																			className="w-full h-full sm:min-h-[60px] text-left p-2 rounded text-xs sm:text-sm text-muted-foreground/50 flex items-center justify-center cursor-not-allowed opacity-50"
																			title={
																				t("rsvp_time_outside_window") ||
																				"This time slot is outside the allowed reservation window"
																			}
																		>
																			+
																		</button>
																	);
																}

																return (
																	<CreateRsvpButton
																		day={day}
																		timeSlot={timeSlot}
																		onCreated={handleRsvpCreated}
																		storeTimezone={storeTimezone}
																		rsvpSettings={rsvpSettings}
																	/>
																);
															})()}
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

			{/* Status Legend */}
			<RsvpStatusLegend t={t} />
		</div>
	);
};
