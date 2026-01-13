"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
	format,
	addDays,
	subDays,
	isSameDay,
	Locale,
	isBefore,
	startOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreFacility } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	generateTimeSlots,
	getReservationDisplayName,
	groupRsvpsByDayAndTime,
	checkTimeAgainstBusinessHours,
} from "@/utils/rsvp-utils";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import {
	getDateInTz,
	getUtcNow,
	getOffsetHours,
	dayAndTimeSlotToUtc,
	dateToEpoch,
	convertToUtc,
} from "@/utils/datetime-utils";
import { isWithinReservationTimeWindow } from "@/utils/rsvp-time-window-utils";
import useSWR from "swr";
import { useParams } from "next/navigation";

interface WeekViewCalendarProps {
	reservations: Rsvp[];
	onRsvpCreated?: (rsvp: Rsvp) => void;
	onRsvpUpdated?: (rsvp: Rsvp) => void;
	rsvpSettings: {
		useBusinessHours: boolean;
		rsvpHours: string | null;
		defaultDuration?: number | null;
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		canReserveBefore?: number | null;
		canReserveAfter?: number | null;
		singleServiceMode?: boolean | null;
	} | null;
	storeSettings: { businessHours: string | null } | null;
	storeTimezone: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
}

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

// admin view of WeekViewCalendar
export const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
	reservations,
	onRsvpCreated,
	onRsvpUpdated,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	storeCurrency = "twd",
	storeUseBusinessHours,
	useCustomerCredit = false,
	creditExchangeRate = null,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams();

	// Convert UTC today to store timezone for display
	const todayUtc = useMemo(() => getUtcNow(), []);
	const today = useMemo(
		() => startOfDay(getDateInTz(todayUtc, getOffsetHours(storeTimezone))),
		[todayUtc, storeTimezone],
	);

	const [rsvps, setRsvps] = useState<Rsvp[]>(reservations);

	// Fetch facilities for availability checking
	const facilitiesUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/facilities`;
	const facilitiesFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeFacilities } = useSWR<StoreFacility[]>(
		facilitiesUrl,
		facilitiesFetcher,
	);

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

	const [currentDay, setCurrentDay] = useState(() => {
		// Always start with today as the first day
		// Use UTC for consistency, then convert to store timezone for display
		return getUtcNow();
	});
	const [openEditDialogId, setOpenEditDialogId] = useState<string | null>(null);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60; // Default to 60 minutes
	const singleServiceMode = rsvpSettings?.singleServiceMode ?? false;

	// Helper function to check if a facility is available at a given time
	const isFacilityAvailableAtTime = useCallback(
		(
			facility: StoreFacility,
			checkTime: Date | null | undefined,
			timezone: string,
		): boolean => {
			// If no time selected, show all facilities
			if (!checkTime || isNaN(checkTime.getTime())) {
				return true;
			}

			// If facility has no business hours, assume it's always available
			if (!facility.businessHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				facility.businessHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[],
	);

	// Helper function to check if any facilities are available for a time slot
	// Returns true if facilities are available OR if no facilities exist (allows reservations without facilities)
	const hasAvailableFacilities = useCallback(
		(slotTime: Date, existingReservations: Rsvp[]): boolean => {
			// If facilities haven't loaded yet, assume available (to avoid hiding buttons prematurely)
			if (!storeFacilities) {
				return true;
			}

			// If no facilities exist at all, allow reservations without facilities
			if (storeFacilities.length === 0) {
				return true;
			}

			// First filter by business hours availability
			let available = storeFacilities.filter((facility: StoreFacility) =>
				isFacilityAvailableAtTime(facility, slotTime, storeTimezone),
			);

			if (available.length === 0) {
				return false;
			}

			// Convert slotTime to epoch for comparison
			const slotTimeEpoch = dateToEpoch(slotTime);
			if (!slotTimeEpoch) {
				return available.length > 0;
			}

			// Calculate slot duration in milliseconds
			const durationMs = defaultDuration * 60 * 1000;
			const slotStart = Number(slotTimeEpoch);
			const slotEnd = slotStart + durationMs;

			// Find existing reservations that overlap with this time slot
			// Filter out cancelled reservations when determining availability
			const conflictingReservations = existingReservations.filter(
				(existingRsvp) => {
					// Exclude cancelled reservations
					if (existingRsvp.status === RsvpStatus.Cancelled) {
						return false;
					}

					// Convert existing reservation time to epoch
					let existingRsvpTime: bigint;
					if (existingRsvp.rsvpTime instanceof Date) {
						existingRsvpTime = BigInt(existingRsvp.rsvpTime.getTime());
					} else if (typeof existingRsvp.rsvpTime === "number") {
						existingRsvpTime = BigInt(existingRsvp.rsvpTime);
					} else if (typeof existingRsvp.rsvpTime === "bigint") {
						existingRsvpTime = existingRsvp.rsvpTime;
					} else {
						return false;
					}

					const existingStart = Number(existingRsvpTime);
					// Get duration from facility or use default
					const existingDuration =
						existingRsvp.Facility?.defaultDuration ?? defaultDuration;
					const existingDurationMs = existingDuration * 60 * 1000;
					const existingEnd = existingStart + existingDurationMs;

					// Check if slots overlap (they overlap if one starts before the other ends)
					return slotStart < existingEnd && slotEnd > existingStart;
				},
			);

			if (singleServiceMode) {
				// Single Service Mode: If ANY reservation exists, no facilities available
				if (conflictingReservations.length > 0) {
					return false;
				}
			} else {
				// Default Mode: Filter out only facilities that have reservations
				const bookedFacilityIds = new Set(
					conflictingReservations
						.map((r) => r.facilityId)
						.filter((id): id is string => Boolean(id)),
				);

				available = available.filter(
					(facility) => !bookedFacilityIds.has(facility.id),
				);
			}

			return available.length > 0;
		},
		[
			storeFacilities,
			isFacilityAvailableAtTime,
			storeTimezone,
			defaultDuration,
			singleServiceMode,
		],
	);

	// Time slots are generated at intervals matching defaultDuration
	// RSVPs are grouped into the correct slots based on defaultDuration
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

	// Convert currentDay (which is in local time) to store timezone for day calculations
	const currentDayInStoreTz = useMemo(
		() => getDateInTz(currentDay, getOffsetHours(storeTimezone)),
		[currentDay, storeTimezone],
	);

	// Always start with today (or the selected day) as the first day
	const weekStart = useMemo(
		() => startOfDay(currentDayInStoreTz),
		[currentDayInStoreTz],
	);
	// Week end is 6 days after week start (7 days total starting from today)
	const weekEnd = useMemo(() => startOfDay(addDays(weekStart, 6)), [weekStart]);

	// Check if current day is before today
	const isDayInPast = useMemo(
		() => isBefore(startOfDay(currentDayInStoreTz), today),
		[currentDayInStoreTz, today],
	);

	// Generate days of the week
	const weekDays = useMemo(() => {
		const days: Date[] = [];
		// Extract date components from weekStart in store timezone
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: storeTimezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		const weekStartStr = formatter.format(weekStart);
		const [startYear, startMonth, startDay] = weekStartStr
			.split("-")
			.map(Number);

		// Create day objects at 00:00 in store timezone, then convert to UTC
		// This ensures each day represents the correct calendar day in store timezone
		for (let i = 0; i < 7; i++) {
			const dayOfMonth = startDay + i;
			// Create datetime-local string for the day at 00:00 in store timezone
			const datetimeLocalString = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}T00:00`;
			// Convert to UTC Date using convertToUtc
			const dayUtc = convertToUtc(datetimeLocalString, storeTimezone);
			days.push(dayUtc);
		}
		return days;
	}, [weekStart, storeTimezone]);

	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Group RSVPs by day and time (convert UTC to store timezone)
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

	// Pre-compute which slots are in the past or too soon (based on canReserveBefore setting)
	const pastSlots = useMemo(() => {
		const past = new Set<string>();
		const now = getUtcNow();
		// Use rsvpSettings.canReserveBefore (default: 2 hours) to match server-side validation
		const minAdvanceHours = rsvpSettings?.canReserveBefore ?? 2;
		const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000; // Convert to milliseconds
		weekDays.forEach((day) => {
			timeSlots.forEach((timeSlot) => {
				const slotDateTimeUtc = dayAndTimeSlotToUtc(
					day,
					timeSlot,
					storeTimezone || "Asia/Taipei",
				);
				const timeUntilSlot = slotDateTimeUtc.getTime() - now.getTime();
				// Mark as past if slot is in the past OR less than minAdvanceHours from now
				if (timeUntilSlot < minAdvanceMs) {
					past.add(`${day.toISOString()}-${timeSlot}`);
				}
			});
		});
		return past;
	}, [weekDays, timeSlots, storeTimezone, rsvpSettings?.canReserveBefore]);

	// Pre-compute which days are today to avoid repeated date calculations
	const todayDays = useMemo(() => {
		const todaySet = new Set<string>();
		weekDays.forEach((day) => {
			if (isToday(day, storeTimezone)) {
				todaySet.add(day.toISOString());
			}
		});
		return todaySet;
	}, [weekDays, storeTimezone]);

	const handlePreviousWeek = useCallback(() => {
		setCurrentDay((prev) => {
			const newDay = subDays(prev, 1);
			const newDayInStoreTz = getDateInTz(
				newDay,
				getOffsetHours(storeTimezone),
			);
			// Don't allow navigation to past days
			if (isBefore(startOfDay(newDayInStoreTz), today)) {
				return prev; // Stay on current day
			}
			return newDay;
		});
	}, [today, storeTimezone]);

	const handleNextWeek = useCallback(() => {
		setCurrentDay((prev) => addDays(prev, 1));
	}, []);

	const handleToday = useCallback(() => {
		setCurrentDay(getUtcNow());
	}, []);

	const getRsvpsForSlot = useCallback(
		(day: Date, timeSlot: string): Rsvp[] => {
			const dayKey = format(day, "yyyy-MM-dd");
			const key = `${dayKey}-${timeSlot}`;
			return groupedRsvps[key] || [];
		},
		[groupedRsvps],
	);

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

	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			{/* Week Navigation */}
			<div className="flex flex-col gap-0 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-0.5 sm:gap-1 font-mono text-sm flex-wrap">
					<Button
						variant="outline"
						size="icon"
						onClick={handlePreviousWeek}
						disabled={isDayInPast}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<Button
						variant="outline"
						onClick={handleToday}
						className="h-10 px-3 text-sm sm:h-9"
					>
						{t("today")}
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={handleNextWeek}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<span className="ml-2 text-base font-semibold sm:ml-4 sm:text-lg">
						<span className="hidden sm:inline">
							{format(weekStart, "MMMdd", { locale: calendarLocale })} -{" "}
							{format(weekEnd, datetimeFormat, { locale: calendarLocale })}
						</span>
						<span className="sm:hidden">
							{format(weekStart, "MMM dd", { locale: calendarLocale })} -{" "}
							{format(weekEnd, "MMM dd", { locale: calendarLocale })}
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
								<th className="w-12 sm:w-20 border-b border-r p-1 sm:p-2 text-right text-base sm:text-sm font-medium text-muted-foreground sticky left-0 bg-background z-10">
									{t("time")}
								</th>
								{weekDays.map((day) => {
									const isDayToday = todayDays.has(day.toISOString());
									return (
										<th
											key={day.toISOString()}
											className={cn(
												"border-b border-r p-0.5 sm:p-2 text-center text-[10px] sm:text-sm font-medium w-[48px] sm:min-w-[110px]",
												isDayToday && "bg-primary/10",
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
														isDayToday && "text-primary",
													)}
												>
													{getDayNumber(day)}
												</span>
											</div>
										</th>
									);
								})}
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
										// Filter out cancelled RSVPs when determining availability
										const activeRsvps = slotRsvps.filter(
											(rsvp) => rsvp.status !== RsvpStatus.Cancelled,
										);
										// Check if this day/time slot is in the past using pre-computed map
										const slotKey = `${day.toISOString()}-${timeSlot}`;
										const isPast = pastSlots.has(slotKey);
										const isDayToday = todayDays.has(day.toISOString());
										return (
											<td
												key={`${day.toISOString()}-${timeSlot}`}
												className={cn(
													"border-b border-r p-0.5 sm:p-1 w-[48px] sm:min-w-[120px] align-top",
													isDayToday && "bg-primary/5",
													"last:border-r-0",
												)}
											>
												<div className="flex flex-col gap-0.5 sm:gap-1 min-h-[50px] sm:min-h-[60px]">
													{activeRsvps.length > 0 &&
														activeRsvps.map((rsvp) => {
															const isCompleted =
																rsvp.status === RsvpStatus.Completed;
															const displayName =
																getReservationDisplayName(rsvp);

															// Render as non-clickable for completed RSVPs
															if (isCompleted) {
																return (
																	<button
																		key={rsvp.id}
																		type="button"
																		disabled
																		className={cn(
																			"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs transition-colors w-full cursor-default",
																			getStatusColorClasses(rsvp.status, false),
																			isPast && "opacity-50",
																		)}
																	>
																		<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																			{displayName}
																		</div>
																		{rsvp.Facility?.facilityName && (
																			<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																				{rsvp.Facility.facilityName}
																			</div>
																		)}
																		{rsvp.ServiceStaff?.User?.name && (
																			<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																				{rsvp.ServiceStaff.User.name}
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

															// Render dialog for editable RSVPs
															return (
																<React.Fragment key={rsvp.id}>
																	<AdminEditRsvpDialog
																		storeId={String(params.storeId)}
																		rsvpSettings={rsvpSettings}
																		storeSettings={storeSettings || null}
																		rsvp={rsvp}
																		existingReservations={rsvps}
																		onReservationUpdated={(updated) => {
																			setOpenEditDialogId(null);
																			handleRsvpUpdated(updated);
																		}}
																		storeTimezone={storeTimezone}
																		storeCurrency={storeCurrency}
																		storeUseBusinessHours={
																			storeUseBusinessHours
																		}
																		useCustomerCredit={useCustomerCredit}
																		creditExchangeRate={creditExchangeRate}
																		open={openEditDialogId === rsvp.id}
																		onOpenChange={(open) => {
																			setOpenEditDialogId(
																				open ? rsvp.id : null,
																			);
																		}}
																		trigger={
																			<div className="relative">
																				<button
																					type="button"
																					onClick={(e) => {
																						e.stopPropagation();
																						setOpenEditDialogId(rsvp.id);
																					}}
																					className={cn(
																						"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs transition-colors w-full",
																						getStatusColorClasses(rsvp.status),
																					)}
																				>
																					<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																						{displayName}
																					</div>
																					{rsvp.Facility?.facilityName && (
																						<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																							{rsvp.Facility.facilityName}
																						</div>
																					)}
																					{rsvp.ServiceStaff?.User?.name && (
																						<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																							{rsvp.ServiceStaff.User.name}
																						</div>
																					)}
																					{rsvp.message && (
																						<div className="text-muted-foreground truncate text-[9px] sm:text-[10px] leading-tight mt-0.5">
																							{rsvp.message}
																						</div>
																					)}
																				</button>
																			</div>
																		}
																	/>
																</React.Fragment>
															);
														})}

													{/* Show "+" button if slot is available and facilities exist */}
													{(() => {
														const canAddMore =
															activeRsvps.length === 0 || !singleServiceMode;
														if (!canAddMore || isPast) return null;

														const slotTimeUtc = dayAndTimeSlotToUtc(
															day,
															timeSlot,
															storeTimezone || "Asia/Taipei",
														);
														if (!hasAvailableFacilities(slotTimeUtc, rsvps)) {
															return null;
														}

														// Check if this time slot is within the reservation window
														const isWithinWindow =
															isWithinReservationTimeWindow(
																rsvpSettings,
																slotTimeUtc,
															);

														if (!isWithinWindow) {
															// Slot is outside the allowed window - show empty disabled state
															return (
																<button
																	type="button"
																	disabled
																	className="w-full h-full sm:min-h-[60px] text-left p-2 rounded text-xs sm:text-sm text-muted-foreground/50 flex items-center justify-center cursor-not-allowed opacity-50"
																	title={
																		t("rsvp_time_outside_window") ||
																		"This time slot is outside the allowed reservation window"
																	}
																></button>
															);
														}

														const addButton = (
															<button
																type="button"
																disabled={isPast}
																className={cn(
																	"w-full h-full sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground flex items-center justify-center",
																	isPast && "cursor-not-allowed opacity-50",
																)}
															>
																+
															</button>
														);

														return (
															<AdminEditRsvpDialog
																storeId={String(params.storeId)}
																rsvpSettings={rsvpSettings}
																storeSettings={storeSettings || null}
																defaultRsvpTime={slotTimeUtc}
																onReservationCreated={handleRsvpCreated}
																existingReservations={rsvps}
																storeTimezone={storeTimezone}
																storeCurrency={storeCurrency}
																storeUseBusinessHours={storeUseBusinessHours}
																useCustomerCredit={useCustomerCredit}
																creditExchangeRate={creditExchangeRate}
																trigger={addButton}
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
