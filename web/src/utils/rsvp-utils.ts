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
import { format } from "date-fns";

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

	// Cannot cancel if already cancelled or no-show
	if (
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
