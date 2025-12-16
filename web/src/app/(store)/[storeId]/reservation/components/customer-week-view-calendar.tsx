"use client";

import {
	IconChevronLeft,
	IconChevronRight,
	IconTrash,
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
	isBefore,
	startOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import { useCallback, useMemo, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, RsvpSettings, StoreSettings } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { ReservationDialog } from "./reservation-dialog";
import {
	getDateInTz,
	getUtcNow,
	getOffsetHours,
	epochToDate,
	dayAndTimeSlotToUtc,
} from "@/utils/datetime-utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { toastError, toastSuccess } from "@/components/toaster";

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
	isBlacklisted?: boolean;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
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
	} catch {
		// If parsing fails, default to 8-22
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
				return;
			}
		} catch {
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
	isBlacklisted = false,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
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
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [reservationToCancel, setReservationToCancel] = useState<Rsvp | null>(
		null,
	);
	const [isCancelling, setIsCancelling] = useState(false);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60; // Default to 60 minutes
	const acceptReservation = rsvpSettings?.acceptReservation ?? true; // Default to true
	const canCreateReservation = acceptReservation && !isBlacklisted;

	//Time slots are generated at intervals matching defaultDuration
	//RSVPs are grouped into the correct slots based on defaultDuration
	//Works with any defaultDuration value (30, 60, 90, 120 minutes, etc.)
	//Maintains backward compatibility (defaults to 60 minutes if defaultDuration is not set)
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
	// User's own reservations will be editable via ReservationDialog
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

	// Pre-compute which slots are in the past to avoid repeated date calculations
	const pastSlots = useMemo(() => {
		const past = new Set<string>();
		weekDays.forEach((day) => {
			timeSlots.forEach((timeSlot) => {
				const slotDateTimeUtc = dayAndTimeSlotToUtc(
					day,
					timeSlot,
					storeTimezone || "Asia/Taipei",
				);
				if (isBefore(slotDateTimeUtc, today)) {
					past.add(`${day.toISOString()}-${timeSlot}`);
				}
			});
		});
		return past;
	}, [weekDays, timeSlots, storeTimezone, today]);

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

	// Helper to check if a reservation belongs to the current user
	const isUserReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (!user) return false;
			// Match by customerId if both exist
			if (user.id && rsvp.customerId) {
				return rsvp.customerId === user.id;
			}
			// Match by email if customerId doesn't match or is missing
			if (user.email && rsvp.Customer?.email) {
				return rsvp.Customer.email.toLowerCase() === user.email.toLowerCase();
			}
			return false;
		},
		[user],
	);

	// Check if reservation can be edited based on rsvpSettings
	// Edit button only appears if:
	// Reservation belongs to the current user
	// Reservation status is Pending or alreadyPaid is true
	// canCancel is enabled in rsvpSettings
	// Reservation is more than cancelHours away from now
	const canEditReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (!isUserReservation(rsvp)) {
				return false;
			}

			// Only allow edit for Pending status or if alreadyPaid
			if (rsvp.status !== RsvpStatus.Pending && !rsvp.alreadyPaid) {
				return false;
			}

			// If rsvpSettings is not available, assume editing is not allowed
			if (!rsvpSettings) {
				return false;
			}

			// Check if canCancel is enabled - if cancellation is disabled, editing is also disabled
			if (!rsvpSettings.canCancel) {
				return false;
			}

			// Check cancelHours window - don't allow editing if within the cancellation window
			const cancelHours = rsvpSettings.cancelHours ?? 24;
			const now = getUtcNow();
			const rsvpTimeDate = epochToDate(
				typeof rsvp.rsvpTime === "number"
					? BigInt(rsvp.rsvpTime)
					: rsvp.rsvpTime instanceof Date
						? BigInt(rsvp.rsvpTime.getTime())
						: rsvp.rsvpTime,
			);

			if (!rsvpTimeDate) {
				return false;
			}

			// Calculate hours until reservation
			const hoursUntilReservation =
				(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

			// Can edit if reservation is more than cancelHours away
			return hoursUntilReservation >= cancelHours;
		},
		[isUserReservation, rsvpSettings],
	);

	// Check if reservation can be cancelled/deleted based on rsvpSettings
	// Cancel/Delete button only appears if:
	// All the same conditions as edit, plus: canCancel is enabled in rsvpSettings
	// Both buttons are hidden if the reservation is within the cancelHours window, preventing last-minute changes.
	const canCancelReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (!isUserReservation(rsvp)) {
				return false;
			}

			// Only allow cancel/delete for Pending status or if alreadyPaid
			if (rsvp.status !== RsvpStatus.Pending && !rsvp.alreadyPaid) {
				return false;
			}

			// If rsvpSettings is not available, assume cancellation is not allowed
			if (!rsvpSettings) {
				return false;
			}

			// Check if canCancel is enabled
			if (!rsvpSettings.canCancel) {
				return false;
			}

			// Check cancelHours window
			const cancelHours = rsvpSettings.cancelHours ?? 24;
			const now = getUtcNow();
			const rsvpTimeDate = epochToDate(
				typeof rsvp.rsvpTime === "number"
					? BigInt(rsvp.rsvpTime)
					: rsvp.rsvpTime instanceof Date
						? BigInt(rsvp.rsvpTime.getTime())
						: rsvp.rsvpTime,
			);

			if (!rsvpTimeDate) {
				return false;
			}

			// Calculate hours until reservation
			const hoursUntilReservation =
				(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

			// Can cancel if reservation is more than cancelHours away
			return hoursUntilReservation >= cancelHours;
		},
		[isUserReservation, rsvpSettings],
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

	const getRsvpsForSlot = useCallback(
		(day: Date, timeSlot: string): Rsvp[] => {
			const dayKey = format(day, "yyyy-MM-dd");
			const key = `${dayKey}-${timeSlot}`;
			return groupedRsvps[key] || [];
		},
		[groupedRsvps],
	);

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

	const handleCancelClick = useCallback((e: React.MouseEvent, rsvp: Rsvp) => {
		e.stopPropagation(); // Prevent triggering edit dialog
		setReservationToCancel(rsvp);
		setCancelDialogOpen(true);
	}, []);

	const handleCancelConfirm = useCallback(async () => {
		if (!reservationToCancel) return;

		setIsCancelling(true);
		try {
			// If status is Pending, delete it (hard delete)
			// Otherwise, cancel it (change status to Cancelled)
			if (reservationToCancel.status === RsvpStatus.Pending) {
				const result = await deleteReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_deleted"),
					});
					// Remove from local state
					setRsvps((prev) =>
						prev.filter((r) => r.id !== reservationToCancel.id),
					);
				}
			} else {
				const result = await cancelReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_cancelled"),
					});
					// Update local state with cancelled reservation
					if (result?.data?.rsvp) {
						handleReservationUpdated(result.data.rsvp);
					} else {
						// If no data returned, remove from list
						setRsvps((prev) =>
							prev.filter((r) => r.id !== reservationToCancel.id),
						);
					}
				}
			}
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsCancelling(false);
			setCancelDialogOpen(false);
			setReservationToCancel(null);
		}
	}, [reservationToCancel, t, handleReservationUpdated]);

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
										const isAvailable = slotRsvps.length === 0;
										// Check if this day/time slot is in the past using pre-computed map
										const slotKey = `${day.toISOString()}-${timeSlot}`;
										const isPast = pastSlots.has(slotKey);
										const canSelect = isAvailable && !isPast;
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
													{slotRsvps.length > 0 ? (
														slotRsvps.map((rsvp) => {
															const canEdit =
																canEditReservation(rsvp) && storeId;
															const canCancel = canCancelReservation(rsvp);
															const rsvpCard = (
																<div
																	className={cn(
																		"text-left p-1.5 sm:p-2 rounded text-[10px] sm:text-xs min-h-[44px] touch-manipulation border-l-2 relative",
																		rsvp.confirmedByStore
																			? "bg-green-50 dark:bg-green-950/20 border-l-green-500"
																			: "bg-yellow-50 dark:bg-yellow-950/20 border-l-yellow-500",
																		rsvp.alreadyPaid && "border-l-blue-500",
																		isUserReservation(rsvp) &&
																			"ring-2 ring-primary/20",
																		canEdit &&
																			"cursor-pointer hover:opacity-80 active:opacity-70",
																	)}
																>
																	{canCancel && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="absolute top-0.5 right-0.5 h-6 w-6 min-h-[32px] min-w-[32px] sm:h-5 sm:w-5 sm:min-h-0 sm:min-w-0 text-destructive hover:text-destructive p-0"
																			onClick={(e) =>
																				handleCancelClick(e, rsvp)
																			}
																			title={
																				rsvp.status === RsvpStatus.Pending
																					? t("rsvp_delete_reservation")
																					: t("rsvp_cancel_reservation")
																			}
																		>
																			<IconTrash className="h-3 w-3 sm:h-4 sm:w-4" />
																		</Button>
																	)}
																	<div className="font-medium truncate leading-tight text-[9px] sm:text-xs pr-6">
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
																</div>
															);

															return canEdit ? (
																<ReservationDialog
																	key={rsvp.id}
																	storeId={storeId || ""}
																	rsvpSettings={rsvpSettings}
																	storeSettings={storeSettings}
																	facilities={facilities}
																	user={user}
																	rsvp={rsvp}
																	rsvps={rsvps}
																	storeTimezone={storeTimezone}
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
														canCreateReservation && storeId ? (
															<ReservationDialog
																storeId={storeId}
																rsvpSettings={rsvpSettings}
																storeSettings={storeSettings}
																facilities={facilities}
																user={user}
																defaultRsvpTime={dayAndTimeSlotToUtc(
																	day,
																	timeSlot,
																	storeTimezone || "Asia/Taipei",
																)}
																onReservationCreated={handleReservationCreated}
																storeTimezone={storeTimezone}
																useCustomerCredit={useCustomerCredit}
																creditExchangeRate={creditExchangeRate}
																creditServiceExchangeRate={
																	creditServiceExchangeRate
																}
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
														) : canCreateReservation ? (
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
														) : null
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

			{/* Cancel/Delete Confirmation Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{reservationToCancel?.status === RsvpStatus.Pending
								? t("rsvp_delete_reservation")
								: t("rsvp_cancel_reservation")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{reservationToCancel?.status === RsvpStatus.Pending
								? t("rsvp_delete_reservation_confirmation")
								: t("rsvp_cancel_reservation_confirmation")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isCancelling}>
							{t("cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelConfirm}
							disabled={isCancelling}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isCancelling
								? reservationToCancel?.status === RsvpStatus.Pending
									? t("deleting")
									: t("cancelling")
								: reservationToCancel?.status === RsvpStatus.Pending
									? t("confirm")
									: t("confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};
