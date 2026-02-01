"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameDay,
	isSameMonth,
	addMonths,
	subMonths,
	startOfWeek,
	endOfWeek,
	isBefore,
	startOfDay,
} from "date-fns";
import type { Locale } from "date-fns";
import type { Rsvp, StoreFacility } from "@/types";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
} from "@/utils/datetime-utils";
import { cn } from "@/lib/utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";

interface FacilityReservationCalendarProps {
	currentMonth: Date;
	onMonthChange: (date: Date) => void;
	selectedDate: Date | null;
	onDateSelect: (date: Date | null) => void;
	existingReservations: Rsvp[];
	facility: StoreFacility;
	storeSettings: { businessHours?: string | null } | null;
	storeTimezone: string;
	dateLocale: Locale;
	numOfAdult: number;
	numOfChild: number;
}

export function FacilityReservationCalendar({
	currentMonth,
	onMonthChange,
	selectedDate,
	onDateSelect,
	existingReservations,
	facility,
	storeSettings,
	storeTimezone,
	dateLocale,
	numOfAdult,
	numOfChild,
}: FacilityReservationCalendarProps) {
	const today = useMemo(() => {
		const now = getUtcNow();
		return startOfDay(getDateInTz(now, getOffsetHours(storeTimezone)));
	}, [storeTimezone]);

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

	const days = useMemo(
		() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
		[calendarStart, calendarEnd],
	);

	// Day labels based on locale
	const dayLabels = useMemo(() => {
		const labels: string[] = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(calendarStart);
			day.setDate(day.getDate() + i);
			labels.push(format(day, "EEEEEE", { locale: dateLocale }));
		}
		return labels;
	}, [calendarStart, dateLocale]);

	// Check if a date is available
	const isDateAvailable = useMemo(() => {
		const availabilityMap = new Map<string, boolean>();

		days.forEach((day) => {
			const dayKey = format(day, "yyyy-MM-dd");

			// Check if date is in the past
			if (isBefore(startOfDay(day), today)) {
				availabilityMap.set(dayKey, false);
				return;
			}

			// Check facility business hours (facility-specific or StoreSettings when null)
			const facilityHours =
				facility.businessHours ?? storeSettings?.businessHours ?? null;
			if (facilityHours) {
				// Check if facility is open at any time during this day
				// For simplicity, check morning, afternoon, and evening
				const testTimes = [
					new Date(
						day.getFullYear(),
						day.getMonth(),
						day.getDate(),
						10,
						0,
						0,
						0,
					),
					new Date(
						day.getFullYear(),
						day.getMonth(),
						day.getDate(),
						14,
						0,
						0,
						0,
					),
					new Date(
						day.getFullYear(),
						day.getMonth(),
						day.getDate(),
						18,
						0,
						0,
						0,
					),
				];

				const isOpen = testTimes.some((testTime) => {
					const result = checkTimeAgainstBusinessHours(
						facilityHours,
						testTime,
						storeTimezone,
					);
					return result.isValid;
				});

				availabilityMap.set(dayKey, isOpen);
			} else {
				// No business hours = always available (except past dates)
				availabilityMap.set(dayKey, true);
			}
		});

		return availabilityMap;
	}, [days, facility, storeSettings?.businessHours, storeTimezone, today]);

	// Check if date has too many reservations (capacity check)
	const isDateFullyBooked = useMemo(() => {
		const bookingMap = new Map<string, boolean>();
		const totalPeople = numOfAdult + numOfChild;
		const facilityCapacity = facility.capacity || 10;

		days.forEach((day) => {
			const dayKey = format(day, "yyyy-MM-dd");
			const dayStart = startOfDay(day).getTime();
			const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

			// Count existing reservations for this day
			const dayReservations = existingReservations.filter((rsvp) => {
				if (!rsvp.rsvpTime) return false;
				const rsvpDate = epochToDate(rsvp.rsvpTime);
				if (!rsvpDate) return false;
				const rsvpTime = rsvpDate.getTime();
				return rsvpTime >= dayStart && rsvpTime < dayEnd;
			});

			// Calculate total people already booked
			const totalBooked = dayReservations.reduce((sum, rsvp) => {
				return sum + (rsvp.numOfAdult || 0) + (rsvp.numOfChild || 0);
			}, 0);

			// Check if there's enough capacity
			bookingMap.set(dayKey, totalBooked + totalPeople > facilityCapacity);
		});

		return bookingMap;
	}, [days, existingReservations, numOfAdult, numOfChild, facility.capacity]);

	const handlePreviousMonth = () => {
		const newMonth = subMonths(currentMonth, 1);
		// Don't allow going to past months
		if (!isBefore(startOfMonth(newMonth), startOfMonth(today))) {
			onMonthChange(newMonth);
		}
	};

	const handleNextMonth = () => {
		onMonthChange(addMonths(currentMonth, 1));
	};

	const handleDateClick = (day: Date) => {
		const dayKey = format(day, "yyyy-MM-dd");
		const isAvailable = isDateAvailable.get(dayKey);
		const isFullyBooked = isDateFullyBooked.get(dayKey);

		if (isAvailable && !isFullyBooked && !isBefore(startOfDay(day), today)) {
			onDateSelect(day);
		}
	};

	return (
		<div className="rounded-lg border bg-card">
			{/* Month Navigation */}
			<div className="flex items-center justify-between border-b p-2 sm:p-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={handlePreviousMonth}
					disabled={isBefore(
						startOfMonth(subMonths(currentMonth, 1)),
						startOfMonth(today),
					)}
					className="h-10 w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 touch-manipulation"
				>
					<IconChevronLeft className="h-4 w-4" />
				</Button>
				<div className="text-sm font-semibold">
					{format(currentMonth, "yyyy年 M月", { locale: dateLocale })}
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleNextMonth}
					className="h-10 w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 touch-manipulation"
				>
					<IconChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{/* Day Labels */}
			<div className="grid grid-cols-7 gap-1 border-b p-1.5 sm:p-2">
				{dayLabels.map((label, index) => (
					<div
						key={index}
						className="text-center text-xs font-medium text-muted-foreground"
					>
						{label}
					</div>
				))}
			</div>

			{/* Calendar Grid */}
			<div className="grid grid-cols-7 gap-1 p-1.5 sm:p-2">
				{days.map((day, dayIdx) => {
					const dayKey = format(day, "yyyy-MM-dd");
					const isCurrentMonth = isSameMonth(day, currentMonth);
					const isSelected = selectedDate && isSameDay(day, selectedDate);
					const isToday = isSameDay(day, today);
					const isAvailable = isDateAvailable.get(dayKey) ?? false;
					const isFullyBooked = isDateFullyBooked.get(dayKey) ?? false;
					const isPast = isBefore(startOfDay(day), today);
					const isClickable =
						isAvailable && !isFullyBooked && !isPast && isCurrentMonth;

					return (
						<button
							key={dayIdx}
							type="button"
							onClick={() => handleDateClick(day)}
							disabled={!isClickable}
							className={cn(
								"relative flex h-11 items-center justify-center rounded-md text-sm transition-colors touch-manipulation sm:h-10 sm:min-h-0",
								!isCurrentMonth && "text-muted-foreground/50",
								isPast && "cursor-not-allowed opacity-50",
								!isAvailable && "cursor-not-allowed opacity-30",
								isFullyBooked && "cursor-not-allowed opacity-50",
								isClickable && "hover:bg-accent hover:text-accent-foreground",
								isToday && !isSelected && "border-2 border-primary",
								isSelected &&
									"bg-primary text-primary-foreground font-semibold",
								!isClickable && "cursor-not-allowed",
							)}
						>
							{format(day, "d")}
							{isFullyBooked && isCurrentMonth && (
								<span className="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
