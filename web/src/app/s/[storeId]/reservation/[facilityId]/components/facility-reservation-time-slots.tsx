"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { isSameDay, addMinutes } from "date-fns";
import type { Locale } from "date-fns";
import type { Rsvp, RsvpSettings, StoreFacility, StoreSettings } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	dayAndTimeSlotToUtc,
	getUtcNow,
} from "@/utils/datetime-utils";
import { cn } from "@/lib/utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

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
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultDuration = facility.defaultDuration
		? Number(facility.defaultDuration)
		: (rsvpSettings?.defaultDuration ?? 60);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;

	// Generate time slots for the selected date
	const timeSlots = useMemo(() => {
		const allSlots = generateTimeSlots(
			useBusinessHours,
			rsvpHours,
			businessHours,
			selectedDate,
			defaultDuration,
		);

		// Filter out past time slots if selected date is today
		const now = getUtcNow();
		const nowInStoreTz = getDateInTz(now, getOffsetHours(storeTimezone));
		const isToday = isSameDay(selectedDate, nowInStoreTz);

		let filteredSlots = allSlots;

		if (isToday) {
			// For today, filter out past time slots
			const currentHour = nowInStoreTz.getHours();
			const currentMinute = nowInStoreTz.getMinutes();
			const currentTimeMinutes = currentHour * 60 + currentMinute;

			filteredSlots = allSlots.filter((timeSlot) => {
				const [hours, minutes] = timeSlot.split(":").map(Number);
				const slotTimeMinutes = hours * 60 + minutes;
				// Only show slots that are at least 1 hour in the future
				// (or at least the default duration if it's less than 1 hour)
				const minAdvanceMinutes = Math.min(60, defaultDuration);
				return slotTimeMinutes >= currentTimeMinutes + minAdvanceMinutes;
			});
		}

		// Filter out slots that have any overlapping reservations (same logic as validateRsvpAvailability)
		return filteredSlots.filter((timeSlot) => {
			// Convert time slot to UTC Date using store timezone (server independent)
			const slotDateTimeUtc = dayAndTimeSlotToUtc(
				selectedDate,
				timeSlot,
				storeTimezone,
			);

			// Check business hours (facility-specific or StoreSettings when null)
			const facilityHours =
				facility.businessHours ?? storeSettings?.businessHours ?? null;
			if (facilityHours) {
				const result = checkTimeAgainstBusinessHours(
					facilityHours,
					slotDateTimeUtc,
					storeTimezone,
				);
				if (!result.isValid) {
					return false;
				}
			}

			// Check if slot conflicts with existing reservations (same logic as validateRsvpAvailability)
			const slotEndUtc = addMinutes(slotDateTimeUtc, defaultDuration);
			const slotStartNumber = slotDateTimeUtc.getTime();
			const slotEndNumber = slotEndUtc.getTime();

			// Check for overlapping reservations (exclude only cancelled, same as validateRsvpAvailability)
			for (const rsvp of existingReservations) {
				// Exclude only cancelled (not no-show, matching validateRsvpAvailability)
				if (rsvp.status === RsvpStatus.Cancelled) {
					continue;
				}

				if (
					!rsvp.rsvpTime ||
					!rsvp.Facility ||
					rsvp.Facility.id !== facility.id
				) {
					continue;
				}

				const rsvpDateUtc = epochToDate(rsvp.rsvpTime);
				if (!rsvpDateUtc) continue;

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
					continue;
				}

				// Use facility defaultDuration or rsvpSettings defaultDuration (same as validateRsvpAvailability)
				const rsvpDuration =
					rsvp.Facility?.defaultDuration ??
					facility.defaultDuration ??
					defaultDuration;
				const rsvpDurationMs = rsvpDuration * 60 * 1000;
				const rsvpStartNumber = rsvpDateUtc.getTime();
				const rsvpEndNumber = rsvpStartNumber + rsvpDurationMs;

				// Check if slots overlap (same logic as validateRsvpAvailability)
				// They overlap if one starts before the other ends
				if (
					slotStartNumber < rsvpEndNumber &&
					slotEndNumber > rsvpStartNumber
				) {
					return false; // Slot has conflict, hide it
				}
			}

			return true; // No conflicts, show slot
		});
	}, [
		useBusinessHours,
		rsvpHours,
		businessHours,
		selectedDate,
		defaultDuration,
		storeTimezone,
		facility,
		existingReservations,
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

			// Check business hours (facility-specific or StoreSettings when null)
			const facilityHours =
				facility.businessHours ?? storeSettings?.businessHours ?? null;
			if (facilityHours) {
				const result = checkTimeAgainstBusinessHours(
					facilityHours,
					slotDateTimeUtc,
					storeTimezone,
				);
				if (!result.isValid) {
					return false;
				}
			}

			// Check if slot conflicts with existing reservations (same logic as validateRsvpAvailability)
			const slotEndUtc = addMinutes(slotDateTimeUtc, defaultDuration);
			const slotStartNumber = slotDateTimeUtc.getTime();
			const slotEndNumber = slotEndUtc.getTime();

			// Check for overlapping reservations (exclude only cancelled, same as validateRsvpAvailability)
			for (const rsvp of existingReservations) {
				// Exclude only cancelled (not no-show, matching validateRsvpAvailability)
				if (rsvp.status === RsvpStatus.Cancelled) {
					continue;
				}

				if (
					!rsvp.rsvpTime ||
					!rsvp.Facility ||
					rsvp.Facility.id !== facility.id
				) {
					continue;
				}

				const rsvpDateUtc = epochToDate(rsvp.rsvpTime);
				if (!rsvpDateUtc) continue;

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
					continue;
				}

				// Use facility defaultDuration or rsvpSettings defaultDuration (same as validateRsvpAvailability)
				const rsvpDuration =
					rsvp.Facility?.defaultDuration ??
					facility.defaultDuration ??
					defaultDuration;
				const rsvpDurationMs = rsvpDuration * 60 * 1000;
				const rsvpStartNumber = rsvpDateUtc.getTime();
				const rsvpEndNumber = rsvpStartNumber + rsvpDurationMs;

				// Check if slots overlap (same logic as validateRsvpAvailability)
				// They overlap if one starts before the other ends
				if (
					slotStartNumber < rsvpEndNumber &&
					slotEndNumber > rsvpStartNumber
				) {
					return false; // Slot has conflict, not available
				}
			}

			return true; // No conflicts, slot is available
		},
		[
			selectedDate,
			facility,
			storeTimezone,
			defaultDuration,
			existingReservations,
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
			<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4">
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
								"h-11 text-sm sm:h-10 sm:min-h-0 touch-manipulation",
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
					{t("rsvp_no_time_slots_available_for_date") ||
						"No time slots available for this date"}
				</div>
			)}
		</div>
	);
}
