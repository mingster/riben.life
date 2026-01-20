"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { format, isSameDay, addMinutes, setHours, setMinutes } from "date-fns";
import type { Locale } from "date-fns";
import type { Rsvp, RsvpSettings, StoreFacility, StoreSettings } from "@/types";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	dayAndTimeSlotToUtc,
	convertToUtc,
} from "@/utils/datetime-utils";
import { cn } from "@/lib/utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";

interface FacilityReservationTimeSlotsProps {
	selectedDate: Date;
	selectedTime: string | null; // Store as "HH:mm" string instead of Date
	onTimeSelect: (time: string | null) => void; // Pass time slot string
	existingReservations: Rsvp[];
	facility: StoreFacility;
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	storeTimezone: string;
	numOfAdult: number;
	numOfChild: number;
	dateLocale: Locale;
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

// Generate time slots from business hours or RSVP hours
const generateTimeSlots = (
	useBusinessHours: boolean,
	rsvpHours: string | null,
	businessHours: string | null,
	selectedDate: Date,
	defaultDuration: number,
): string[] => {
	const hoursJson = useBusinessHours ? businessHours : rsvpHours;
	if (!hoursJson) {
		// Default: 8 AM to 10 PM, every hour
		const slots: string[] = [];
		for (let hour = 8; hour < 22; hour++) {
			slots.push(`${String(hour).padStart(2, "0")}:00`);
		}
		return slots;
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

		// Get day of week (0 = Sunday, 6 = Saturday)
		const dayOfWeek = selectedDate.getDay();
		const dayName = dayNames[dayOfWeek];
		const dayHours = schedule[dayName];

		if (dayHours !== "closed" && Array.isArray(dayHours)) {
			dayHours.forEach((range: TimeRange) => {
				const [fromHour, fromMin] = range.from.split(":").map(Number);
				const [toHour, toMin] = range.to.split(":").map(Number);

				let currentHour = fromHour;
				let currentMin = fromMin;

				while (
					currentHour < toHour ||
					(currentHour === toHour && currentMin < toMin)
				) {
					const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
					slots.add(timeStr);

					// Increment by default duration (in minutes)
					currentMin += defaultDuration;
					if (currentMin >= 60) {
						currentHour += Math.floor(currentMin / 60);
						currentMin = currentMin % 60;
					}
				}
			});
		}

		return Array.from(slots).sort();
	} catch {
		// Fallback to default slots
		const slots: string[] = [];
		for (let hour = 8; hour < 22; hour++) {
			slots.push(`${String(hour).padStart(2, "0")}:00`);
		}
		return slots;
	}
};

export function FacilityReservationTimeSlots({
	selectedDate,
	selectedTime,
	onTimeSelect,
	existingReservations,
	facility,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	numOfAdult,
	numOfChild,
	dateLocale,
}: FacilityReservationTimeSlotsProps) {
	const defaultDuration = facility.defaultDuration
		? Number(facility.defaultDuration)
		: (rsvpSettings?.defaultDuration ?? 60);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;

	// Generate time slots for the selected date
	const timeSlots = useMemo(() => {
		return generateTimeSlots(
			useBusinessHours,
			rsvpHours,
			businessHours,
			selectedDate,
			defaultDuration,
		);
	}, [
		useBusinessHours,
		rsvpHours,
		businessHours,
		selectedDate,
		defaultDuration,
	]);

	// Check if a time slot is available
	const isTimeSlotAvailable = useCallback(
		(timeSlot: string): boolean => {
			// Convert time slot to UTC Date using store timezone (server independent)
			const slotDateTimeUtc = dayAndTimeSlotToUtc(
				selectedDate,
				timeSlot,
				storeTimezone,
			);

			// Check business hours (pass UTC Date, function will convert to store timezone internally)
			if (facility.businessHours) {
				const result = checkTimeAgainstBusinessHours(
					facility.businessHours,
					slotDateTimeUtc,
					storeTimezone,
				);
				if (!result.isValid) {
					return false;
				}
			}

			// Check if slot conflicts with existing reservations
			const slotEndUtc = addMinutes(slotDateTimeUtc, defaultDuration);
			const totalPeople = numOfAdult + numOfChild;
			const facilityCapacity = facility.capacity || 10;

			// Count overlapping reservations
			const overlappingReservations = existingReservations.filter((rsvp) => {
				if (
					!rsvp.rsvpTime ||
					!rsvp.Facility ||
					rsvp.Facility.id !== facility.id
				) {
					return false;
				}

				const rsvpDateUtc = epochToDate(rsvp.rsvpTime);
				if (!rsvpDateUtc) return false;

				// Compare in UTC (both are UTC Dates)
				// Check if reservation is on the same day in store timezone
				const rsvpDateInStoreTz = getDateInTz(
					rsvpDateUtc,
					getOffsetHours(storeTimezone),
				);
				const slotDateInStoreTz = getDateInTz(
					slotDateTimeUtc,
					getOffsetHours(storeTimezone),
				);
				if (!isSameDay(rsvpDateInStoreTz, slotDateInStoreTz)) {
					return false;
				}

				const rsvpDuration = rsvp.duration
					? Number(rsvp.duration)
					: defaultDuration;
				const rsvpEndUtc = addMinutes(rsvpDateUtc, rsvpDuration);

				// Check for overlap (all in UTC)
				return (
					(rsvpDateUtc >= slotDateTimeUtc && rsvpDateUtc < slotEndUtc) ||
					(rsvpEndUtc > slotDateTimeUtc && rsvpEndUtc <= slotEndUtc) ||
					(rsvpDateUtc <= slotDateTimeUtc && rsvpEndUtc >= slotEndUtc)
				);
			});

			// Calculate total people in overlapping reservations
			const totalBooked = overlappingReservations.reduce((sum, rsvp) => {
				return sum + (rsvp.numOfAdult || 0) + (rsvp.numOfChild || 0);
			}, 0);

			// Check if there's enough capacity
			return totalBooked + totalPeople <= facilityCapacity;
		},
		[
			selectedDate,
			facility,
			storeTimezone,
			defaultDuration,
			existingReservations,
			numOfAdult,
			numOfChild,
		],
	);

	const handleTimeSlotClick = useCallback(
		(timeSlot: string) => {
			if (!isTimeSlotAvailable(timeSlot)) return;

			// Pass time slot string directly (e.g., "14:30")
			// Parent component will convert to UTC using dayAndTimeSlotToUtc
			onTimeSelect(timeSlot);
		},
		[isTimeSlotAvailable, onTimeSelect],
	);

	// Format time for display (AM/PM format based on locale)
	const formatTime = useCallback(
		(timeSlot: string): string => {
			const [hours, minutes] = timeSlot.split(":").map(Number);

			// Use locale-aware formatting
			if (dateLocale.code === "zh-TW" || dateLocale.code === "ja") {
				// Chinese/Japanese: 上午/下午 format
				const hour24 = hours;
				if (hour24 < 12) {
					return `上午${hour24}:${String(minutes).padStart(2, "0")}`;
				} else if (hour24 === 12) {
					return `下午${hour24}:${String(minutes).padStart(2, "0")}`;
				} else {
					return `下午${hour24 - 12}:${String(minutes).padStart(2, "0")}`;
				}
			} else {
				// English: Format manually for AM/PM
				const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
				const ampm = hours < 12 ? "AM" : "PM";
				return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
			}
		},
		[dateLocale],
	);

	return (
		<div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
				{timeSlots.map((timeSlot) => {
					const isAvailable = isTimeSlotAvailable(timeSlot);
					const isSelected = selectedTime === timeSlot;

					return (
						<Button
							key={timeSlot}
							variant={isSelected ? "default" : "outline"}
							onClick={() => handleTimeSlotClick(timeSlot)}
							disabled={!isAvailable}
							className={cn(
								"h-10 text-sm",
								!isAvailable && "cursor-not-allowed opacity-50",
								isSelected && "bg-primary text-primary-foreground",
							)}
						>
							{formatTime(timeSlot)}
						</Button>
					);
				})}
			</div>
			{timeSlots.length === 0 && (
				<div className="text-center text-sm text-muted-foreground">
					No time slots available for this date
				</div>
			)}
		</div>
	);
}
