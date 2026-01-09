"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { RsvpStatus } from "@/types/enum";
import { getT } from "@/app/i18n";

interface RsvpSettingsForAvailability {
	singleServiceMode?: boolean | null;
	defaultDuration?: number | null;
}

/**
 * Validates that a reservation time slot is available based on singleServiceMode setting
 * @param storeId - Store ID
 * @param rsvpSettings - RsvpSettings object containing singleServiceMode and defaultDuration
 * @param rsvpTime - BigInt epoch time (milliseconds) representing the reservation start time
 * @param facilityId - Facility ID (required if singleServiceMode is false)
 * @param duration - Reservation duration in minutes (defaults to facility defaultDuration or rsvpSettings.defaultDuration)
 * @param excludeRsvpId - Optional: RSVP ID to exclude from conflict check (for updates)
 * @throws SafeError if time slot is not available
 */
export async function validateRsvpAvailability(
	storeId: string,
	rsvpSettings: RsvpSettingsForAvailability | null | undefined,
	rsvpTime: bigint,
	facilityId: string,
	duration?: number | null,
	excludeRsvpId?: string,
): Promise<void> {
	// If settings are not available, skip validation (graceful degradation)
	if (!rsvpSettings) {
		return;
	}

	const singleServiceMode = rsvpSettings.singleServiceMode ?? false;
	const defaultDuration = duration ?? rsvpSettings.defaultDuration ?? 60;
	const durationMs = defaultDuration * 60 * 1000; // Convert minutes to milliseconds
	const rsvpTimeNumber = Number(rsvpTime);
	const slotEnd = rsvpTimeNumber + durationMs;

	if (singleServiceMode) {
		// Single Service Mode: Check if ANY reservation exists for this time slot (across all facilities)
		// Find all active reservations that could overlap with this time slot
		const potentiallyConflictingReservations = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				id: excludeRsvpId ? { not: excludeRsvpId } : undefined,
				status: {
					not: RsvpStatus.Cancelled, // Exclude cancelled
				},
				rsvpTime: {
					lt: BigInt(slotEnd), // Start time is before our slot ends
				},
			},
			include: {
				Facility: {
					select: {
						defaultDuration: true,
					},
				},
			},
		});

		// Check for actual overlaps considering each reservation's duration
		for (const existingReservation of potentiallyConflictingReservations) {
			const existingDuration =
				existingReservation.Facility?.defaultDuration ??
				rsvpSettings.defaultDuration ??
				60;
			const existingDurationMs = existingDuration * 60 * 1000;
			const existingSlotStart = Number(existingReservation.rsvpTime);
			const existingSlotEnd = existingSlotStart + existingDurationMs;

			// Check if slots overlap (they overlap if one starts before the other ends)
			if (rsvpTimeNumber < existingSlotEnd && slotEnd > existingSlotStart) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_time_slot_already_booked_single_service") ||
						"This time slot is already booked. Only one reservation is allowed per time slot in single service mode.",
				);
			}
		}
	} else {
		// Default Mode: Check if the specific facility has a reservation at this time slot
		// Find all active reservations for this facility that could overlap
		const potentiallyConflictingReservations = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				facilityId,
				id: excludeRsvpId ? { not: excludeRsvpId } : undefined,
				status: {
					not: RsvpStatus.Cancelled, // Exclude cancelled
				},
				rsvpTime: {
					lt: BigInt(slotEnd), // Start time is before our slot ends
				},
			},
			include: {
				Facility: {
					select: {
						defaultDuration: true,
					},
				},
			},
		});

		// Check for actual overlaps considering each reservation's duration
		for (const existingReservation of potentiallyConflictingReservations) {
			const existingDuration =
				existingReservation.Facility?.defaultDuration ??
				rsvpSettings.defaultDuration ??
				60;
			const existingDurationMs = existingDuration * 60 * 1000;
			const existingSlotStart = Number(existingReservation.rsvpTime);
			const existingSlotEnd = existingSlotStart + existingDurationMs;

			// Check if slots overlap (they overlap if one starts before the other ends)
			if (rsvpTimeNumber < existingSlotEnd && slotEnd > existingSlotStart) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_time_slot_already_booked_facility") ||
						"This time slot is already booked for this facility. Please select a different time.",
				);
			}
		}
	}
}
