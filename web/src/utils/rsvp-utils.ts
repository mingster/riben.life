/**
 * RSVP Business Logic Utilities
 *
 * Centralized business logic for RSVP operations that can be used by both
 * customer-facing views (store) and admin views (storeAdmin).
 */

import type { Rsvp, User } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getUtcNow,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format, parseISO } from "date-fns";

/**
 * Business hours schedule type
 */
export type BusinessHoursSchedule = {
	Monday?: Array<{ from: string; to: string }> | "closed";
	Tuesday?: Array<{ from: string; to: string }> | "closed";
	Wednesday?: Array<{ from: string; to: string }> | "closed";
	Thursday?: Array<{ from: string; to: string }> | "closed";
	Friday?: Array<{ from: string; to: string }> | "closed";
	Saturday?: Array<{ from: string; to: string }> | "closed";
	Sunday?: Array<{ from: string; to: string }> | "closed";
};

/**
 * Day names constant for business hours checking
 */
export const DAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

/**
 * Check if time falls within a time range (handles midnight spanning)
 *
 * @param checkTimeMinutes - Time to check in minutes (0-1439)
 * @param fromMinutes - Start time in minutes (0-1439)
 * @param toMinutes - End time in minutes (0-1439)
 * @returns true if time is within range
 */
export function isTimeInRange(
	checkTimeMinutes: number,
	fromMinutes: number,
	toMinutes: number,
): boolean {
	// Normal range
	if (checkTimeMinutes >= fromMinutes && checkTimeMinutes < toMinutes) {
		return true;
	}
	// Range spanning midnight (e.g., 22:00 to 02:00)
	if (fromMinutes > toMinutes) {
		return checkTimeMinutes >= fromMinutes || checkTimeMinutes < toMinutes;
	}
	return false;
}

/**
 * Parse business hours and check if time is within schedule
 *
 * @param hoursJson - Business hours JSON string
 * @param checkTime - Time to check (UTC Date)
 * @param timezone - Store timezone (e.g., "Asia/Taipei")
 * @returns Object with isValid flag and optional dayHours array
 */
export function checkTimeAgainstBusinessHours(
	hoursJson: string | null | undefined,
	checkTime: Date,
	timezone: string,
): { isValid: boolean; dayHours?: Array<{ from: string; to: string }> } {
	if (!hoursJson) {
		return { isValid: true };
	}

	try {
		const schedule = JSON.parse(hoursJson) as BusinessHoursSchedule;
		const offsetHours = getOffsetHours(timezone);
		const timeInStoreTz = getDateInTz(checkTime, offsetHours);
		const dayOfWeek = timeInStoreTz.getDay();
		const dayName = DAY_NAMES[dayOfWeek];
		const dayHours = schedule[dayName];

		if (!dayHours || dayHours === "closed") {
			return { isValid: false };
		}

		const checkHour = timeInStoreTz.getHours();
		const checkMinute = timeInStoreTz.getMinutes();
		const checkTimeMinutes = checkHour * 60 + checkMinute;

		for (const range of dayHours) {
			const [fromHour, fromMinute] = range.from.split(":").map(Number);
			const [toHour, toMinute] = range.to.split(":").map(Number);
			const fromMinutes = fromHour * 60 + fromMinute;
			const toMinutes = toHour * 60 + toMinute;

			if (isTimeInRange(checkTimeMinutes, fromMinutes, toMinutes)) {
				return { isValid: true, dayHours };
			}
		}

		return { isValid: false, dayHours };
	} catch {
		// If parsing fails, assume valid (graceful degradation)
		return { isValid: true };
	}
}

/**
 * Convert rsvpTime to epoch BigInt
 *
 * @param rsvpTime - Time as Date, number, bigint, or null/undefined
 * @returns BigInt epoch milliseconds or null if invalid
 */
export function rsvpTimeToEpoch(
	rsvpTime: Date | number | bigint | null | undefined,
): bigint | null {
	if (!rsvpTime) return null;
	if (rsvpTime instanceof Date) return BigInt(rsvpTime.getTime());
	if (typeof rsvpTime === "number") return BigInt(rsvpTime);
	if (typeof rsvpTime === "bigint") return rsvpTime;
	return null;
}

/**
 * Transform reservation for localStorage (convert BigInt/Date to number)
 *
 * @param rsvp - Reservation to transform
 * @returns Reservation with BigInt/Date fields converted to numbers
 */
export function transformReservationForStorage(rsvp: Rsvp): Rsvp {
	return {
		...rsvp,
		rsvpTime:
			typeof rsvp.rsvpTime === "number"
				? rsvp.rsvpTime
				: rsvp.rsvpTime instanceof Date
					? rsvp.rsvpTime.getTime()
					: typeof rsvp.rsvpTime === "bigint"
						? Number(rsvp.rsvpTime)
						: null,
		createdAt:
			typeof rsvp.createdAt === "number"
				? rsvp.createdAt
				: typeof rsvp.createdAt === "bigint"
					? Number(rsvp.createdAt)
					: rsvp.createdAt instanceof Date
						? rsvp.createdAt.getTime()
						: null,
		updatedAt:
			typeof rsvp.updatedAt === "number"
				? rsvp.updatedAt
				: typeof rsvp.updatedAt === "bigint"
					? Number(rsvp.updatedAt)
					: rsvp.updatedAt instanceof Date
						? rsvp.updatedAt.getTime()
						: null,
	} as Rsvp;
}

/**
 * RsvpSettings type for business logic
 * Only includes fields needed for business logic checks
 */
export interface RsvpSettingsForLogic {
	canCancel?: boolean | null;
	cancelHours?: number | null;
}

/**
 * Check if a reservation belongs to a user
 *
 * @param rsvp - The reservation to check
 * @param user - The current user (can be null for anonymous users)
 * @param localStorageReservations - Optional array of reservations from local storage (for anonymous users)
 * @returns true if the reservation belongs to the user
 */
export function isUserReservation(
	rsvp: Rsvp,
	user: User | null,
	localStorageReservations?: Rsvp[],
): boolean {
	// For logged-in users: check customerId
	if (user?.id) {
		// Match by customerId if both exist
		if (user.id && rsvp.customerId) {
			return rsvp.customerId === user.id;
		}
		// Match by email if customerId doesn't match or is missing
		if (user.email && rsvp.Customer?.email) {
			return rsvp.Customer.email.toLowerCase() === user.email.toLowerCase();
		}
		return false;
	}

	// For anonymous users: check if reservation exists in local storage
	if (
		!user &&
		localStorageReservations &&
		localStorageReservations.length > 0
	) {
		return localStorageReservations.some((r) => r.id === rsvp.id);
	}

	return false;
}

/**
 * Check if a reservation can be edited
 *
 * @param rsvp - The reservation to check
 * @param rsvpSettings - The RSVP settings for the store
 * @param isUserReservationFn - Function to check if reservation belongs to user
 * @returns true if the reservation can be edited
 */
export function canEditReservation(
	rsvp: Rsvp,
	rsvpSettings: RsvpSettingsForLogic | null | undefined,
	isUserReservationFn: (rsvp: Rsvp) => boolean,
): boolean {
	// Must belong to user
	if (!isUserReservationFn(rsvp)) {
		return false;
	}

	// Cannot edit if already completed, cancelled, or no-show
	if (
		rsvp.status === RsvpStatus.Completed ||
		rsvp.status === RsvpStatus.Cancelled ||
		rsvp.status === RsvpStatus.NoShow
	) {
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
	// This applies to ALL reservations, including Pending and ReadyToConfirm
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

	// Don't allow editing if within the cancellation window
	if (hoursUntilReservation < cancelHours) {
		return false;
	}

	// Can edit if reservation is more than cancelHours away
	return true;
}

/**
 * Check if a reservation can be cancelled/deleted
 *
 * @param rsvp - The reservation to check
 * @param rsvpSettings - The RSVP settings for the store
 * @param isUserReservationFn - Function to check if reservation belongs to user
 * @returns true if the reservation can be cancelled
 */
export function canCancelReservation(
	rsvp: Rsvp,
	rsvpSettings: RsvpSettingsForLogic | null | undefined,
	isUserReservationFn: (rsvp: Rsvp) => boolean,
): boolean {
	// Must belong to user
	if (!isUserReservationFn(rsvp)) {
		return false;
	}

	// Cannot cancel if already completed, cancelled, or no-show
	if (
		rsvp.status === RsvpStatus.Completed ||
		rsvp.status === RsvpStatus.Cancelled ||
		rsvp.status === RsvpStatus.NoShow
	) {
		return false;
	}

	// Pending reservations can always be deleted regardless of other conditions
	if (
		rsvp.status === RsvpStatus.Pending ||
		rsvp.status === RsvpStatus.ReadyToConfirm
	) {
		return true;
	}

	// If rsvpSettings is not available, assume cancellation is not allowed
	if (!rsvpSettings) {
		return false;
	}

	// RSVP owners can cancel if canCancel is enabled (regardless of status or payment)
	// (refund/no-refund logic is handled in the cancel action based on time window)
	if (rsvpSettings.canCancel) {
		return true;
	}

	return false;
}

/**
 * Remove a reservation from local storage
 *
 * @param storeId - The store ID
 * @param reservationId - The reservation ID to remove
 * @param onUpdate - Optional callback to update state after removal
 * @returns true if the reservation was successfully removed
 */
export function removeReservationFromLocalStorage(
	storeId: string,
	reservationId: string,
	onUpdate?: (updatedReservations: Rsvp[]) => void,
): boolean {
	if (!storeId) {
		return false;
	}

	const storageKey = `rsvp-${storeId}`;
	try {
		const storedData = localStorage.getItem(storageKey);
		if (storedData) {
			const localReservations: Rsvp[] = JSON.parse(storedData);
			const updated = localReservations.filter((r) => r.id !== reservationId);
			if (updated.length > 0) {
				localStorage.setItem(storageKey, JSON.stringify(updated));
			} else {
				localStorage.removeItem(storageKey);
			}
			onUpdate?.(updated);
			return true;
		}
		return false;
	} catch (error) {
		// Silently handle errors
		return false;
	}
}

/**
 * Format RSVP time for display
 *
 * @param rsvp - The reservation
 * @param datetimeFormat - The date format string (e.g., "yyyy-MM-dd")
 * @param defaultTimezone - Default timezone to use if store timezone is not available
 * @returns Formatted date/time string or "-" if invalid
 */
export function formatRsvpTime(
	rsvp: Rsvp,
	datetimeFormat: string,
	defaultTimezone: string = "Asia/Taipei",
): string {
	const rsvpTime = rsvp.rsvpTime;
	if (!rsvpTime) return "-";

	const rsvpTimeEpoch =
		typeof rsvpTime === "number"
			? BigInt(rsvpTime)
			: rsvpTime instanceof Date
				? BigInt(rsvpTime.getTime())
				: rsvpTime;

	const utcDate = epochToDate(rsvpTimeEpoch);
	if (!utcDate) return "-";

	const timezone = rsvp.Store?.defaultTimezone ?? defaultTimezone;
	const storeDate = getDateInTz(utcDate, getOffsetHours(timezone));

	return format(storeDate, `${datetimeFormat} HH:mm`);
}

/**
 * Format created at time for display
 *
 * @param rsvp - The reservation
 * @param datetimeFormat - The date format string (e.g., "yyyy-MM-dd")
 * @param defaultTimezone - Default timezone to use if store timezone is not available
 * @returns Formatted date/time string or "-" if invalid
 */
export function formatCreatedAt(
	rsvp: Rsvp,
	datetimeFormat: string,
	defaultTimezone: string = "Asia/Taipei",
): string {
	const createdAt = rsvp.createdAt;
	if (!createdAt) return "-";

	const createdAtEpoch =
		typeof createdAt === "number"
			? BigInt(createdAt)
			: createdAt instanceof Date
				? BigInt(createdAt.getTime())
				: createdAt;

	const utcDate = epochToDate(createdAtEpoch);
	if (!utcDate) return "-";

	const timezone = rsvp.Store?.defaultTimezone ?? defaultTimezone;
	const storeDate = getDateInTz(utcDate, getOffsetHours(timezone));

	return format(storeDate, `${datetimeFormat} HH:mm`);
}

/**
 * Get facility name with store name
 *
 * @param rsvp - The reservation
 * @returns Formatted facility name string (e.g., "Store Name - Facility Name" or "-" if neither exists)
 */
export function getFacilityName(rsvp: Rsvp): string {
	const storeName = rsvp.Store?.name;
	const facilityName = rsvp.Facility?.facilityName;

	if (!storeName && !facilityName) {
		return "-";
	}

	if (storeName && facilityName) {
		return `${storeName} - ${facilityName}`;
	}

	return storeName || facilityName || "-";
}

/**
 * Time range interface for business hours
 */
export interface TimeRange {
	from: string;
	to: string;
}

/**
 * Weekly schedule interface for business hours
 */
export interface WeeklySchedule {
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

/**
 * Extract all unique hours from businessHours or rsvpHours JSON format
 *
 * @param hoursJson - Business hours JSON string
 * @returns Array of unique hours (0-23) or default 8-22 if parsing fails
 */
export function extractHoursFromSchedule(hoursJson: string | null): number[] {
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
}

/**
 * Generate time slots based on rsvpSettings and storeSettings
 * Slots are generated at intervals based on defaultDuration (in minutes)
 *
 * @param useBusinessHours - Whether to use business hours or RSVP hours
 * @param rsvpHours - RSVP hours JSON string
 * @param businessHours - Business hours JSON string
 * @param defaultDuration - Default duration in minutes (default: 60)
 * @returns Array of time slot strings (e.g., ["08:00", "09:00", ...])
 */
export function generateTimeSlots(
	useBusinessHours: boolean,
	rsvpHours: string | null,
	businessHours: string | null,
	defaultDuration: number = 60, // Default to 60 minutes (1 hour)
): string[] {
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
}

/**
 * Get display name for a reservation
 * Priority: name > Customer.name > Customer.email > guest count
 *
 * @param rsvp - The reservation
 * @returns Display name string
 */
export function getReservationDisplayName(rsvp: Rsvp): string {
	if (rsvp.name) return rsvp.name;
	if (rsvp.Customer?.name) return rsvp.Customer.name;
	if (rsvp.Customer?.email) return rsvp.Customer.email;
	const guestCount = rsvp.numOfAdult + rsvp.numOfChild;
	return `${guestCount} ${guestCount === 1 ? "guest" : "guests"}`;
}

/**
 * Group RSVPs by day and time slot
 * RSVP dates are in UTC, convert to store timezone for display and grouping
 * Match RSVPs to slots based on defaultDuration
 *
 * @param rsvps - Array of reservations
 * @param weekStart - Start of week (Date in store timezone)
 * @param weekEnd - End of week (Date in store timezone)
 * @param storeTimezone - Store timezone (e.g., "Asia/Taipei")
 * @param defaultDuration - Default duration in minutes (default: 60)
 * @returns Record mapping "yyyy-MM-dd-HH:mm" keys to arrays of RSVPs
 */
export function groupRsvpsByDayAndTime(
	rsvps: Rsvp[],
	weekStart: Date,
	weekEnd: Date,
	storeTimezone: string,
	defaultDuration: number = 60, // Default to 60 minutes
): Record<string, Rsvp[]> {
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
}
