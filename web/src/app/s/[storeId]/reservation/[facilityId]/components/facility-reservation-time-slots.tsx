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
import { sumOverlappingPartyHeadcount } from "@/utils/rsvp-restaurant-capacity-utils";
import { cn } from "@/lib/utils";
import { getEffectiveFacilityBusinessHoursJson } from "@/lib/facility/get-effective-facility-business-hours";
import {
	checkTimeAgainstBusinessHours,
	effectiveRsvpSlotDurationMinutes,
} from "@/utils/rsvp-utils";
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
	storeUseBusinessHours: boolean;
	storeTimezone: string;
	numOfAdult: number;
	numOfChild: number;
	dateLocale: Locale;
	/** When set, capacity is enforced store-wide (restaurant mode) instead of per-facility exclusivity. */
	restaurantPartyBooking?: { maxCapacity: number; headcount: number } | null;
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

// Generate time slots from a single weekly schedule JSON (effective facility hours).
const generateTimeSlotsFromScheduleJson = (
	hoursJson: string | null,
	selectedDate: Date,
	slotStepMinutes: number,
): string[] => {
	if (!hoursJson) {
		// Default: 8 AM to 10 PM, stepped by RsvpSettings defaultDuration
		const slots: string[] = [];
		for (let t = 8 * 60; t < 22 * 60; t += slotStepMinutes) {
			const h = Math.floor(t / 60);
			const m = t % 60;
			slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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

					// Increment by RSVP default duration (in minutes) — slot length / step
					currentMin += slotStepMinutes;
					if (currentMin >= 60) {
						currentHour += Math.floor(currentMin / 60);
						currentMin = currentMin % 60;
					}
				}
			});
		}

		return Array.from(slots).sort();
	} catch {
		const slots: string[] = [];
		for (let t = 8 * 60; t < 22 * 60; t += slotStepMinutes) {
			const h = Math.floor(t / 60);
			const m = t % 60;
			slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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
	storeUseBusinessHours,
	storeTimezone,
	numOfAdult,
	numOfChild,
	dateLocale,
	restaurantPartyBooking = null,
}: FacilityReservationTimeSlotsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const slotStepMinutes = effectiveRsvpSlotDurationMinutes(
		rsvpSettings,
		facility,
	);

	const effectiveHoursJson = useMemo(
		() =>
			getEffectiveFacilityBusinessHoursJson(
				facility,
				rsvpSettings,
				storeUseBusinessHours,
				storeSettings?.businessHours ?? null,
			),
		[
			facility,
			rsvpSettings,
			storeUseBusinessHours,
			storeSettings?.businessHours,
		],
	);

	// Generate time slots for the selected date
	const timeSlots = useMemo(() => {
		const allSlots = generateTimeSlotsFromScheduleJson(
			effectiveHoursJson,
			selectedDate,
			slotStepMinutes,
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
				const minAdvanceMinutes = Math.min(60, slotStepMinutes);
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

			if (effectiveHoursJson) {
				const result = checkTimeAgainstBusinessHours(
					effectiveHoursJson,
					slotDateTimeUtc,
					storeTimezone,
				);
				if (!result.isValid) {
					return false;
				}
			}

			const slotEndUtc = addMinutes(slotDateTimeUtc, slotStepMinutes);
			const slotStartNumber = slotDateTimeUtc.getTime();
			const slotEndNumber = slotEndUtc.getTime();

			if (restaurantPartyBooking && restaurantPartyBooking.maxCapacity > 0) {
				const occupied = sumOverlappingPartyHeadcount(
					existingReservations,
					slotStartNumber,
					slotEndNumber,
					slotStepMinutes,
					storeTimezone,
				);
				return (
					occupied + restaurantPartyBooking.headcount <=
					restaurantPartyBooking.maxCapacity
				);
			}

			if (restaurantPartyBooking) {
				return true;
			}

			// Facility mode: per-facility exclusivity (same logic as validateRsvpAvailability)
			for (const rsvp of existingReservations) {
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

				const rsvpDuration =
					rsvp.Facility?.defaultDuration ??
					facility.defaultDuration ??
					slotStepMinutes;
				const rsvpDurationMs = rsvpDuration * 60 * 1000;
				const rsvpStartNumber = rsvpDateUtc.getTime();
				const rsvpEndNumber = rsvpStartNumber + rsvpDurationMs;

				if (
					slotStartNumber < rsvpEndNumber &&
					slotEndNumber > rsvpStartNumber
				) {
					return false;
				}
			}

			return true;
		});
	}, [
		effectiveHoursJson,
		selectedDate,
		slotStepMinutes,
		storeTimezone,
		facility,
		existingReservations,
		restaurantPartyBooking,
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

			if (effectiveHoursJson) {
				const result = checkTimeAgainstBusinessHours(
					effectiveHoursJson,
					slotDateTimeUtc,
					storeTimezone,
				);
				if (!result.isValid) {
					return false;
				}
			}

			const slotEndUtc = addMinutes(slotDateTimeUtc, slotStepMinutes);
			const slotStartNumber = slotDateTimeUtc.getTime();
			const slotEndNumber = slotEndUtc.getTime();

			if (restaurantPartyBooking && restaurantPartyBooking.maxCapacity > 0) {
				const occupied = sumOverlappingPartyHeadcount(
					existingReservations,
					slotStartNumber,
					slotEndNumber,
					slotStepMinutes,
					storeTimezone,
				);
				return (
					occupied + restaurantPartyBooking.headcount <=
					restaurantPartyBooking.maxCapacity
				);
			}

			if (restaurantPartyBooking) {
				return true;
			}

			for (const rsvp of existingReservations) {
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

				const rsvpDuration =
					rsvp.Facility?.defaultDuration ??
					facility.defaultDuration ??
					slotStepMinutes;
				const rsvpDurationMs = rsvpDuration * 60 * 1000;
				const rsvpStartNumber = rsvpDateUtc.getTime();
				const rsvpEndNumber = rsvpStartNumber + rsvpDurationMs;

				if (
					slotStartNumber < rsvpEndNumber &&
					slotEndNumber > rsvpStartNumber
				) {
					return false;
				}
			}

			return true;
		},
		[
			selectedDate,
			effectiveHoursJson,
			facility,
			storeTimezone,
			slotStepMinutes,
			existingReservations,
			restaurantPartyBooking,
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
