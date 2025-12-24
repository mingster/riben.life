"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { headers } from "next/headers";
import { RsvpStatus } from "@/types/enum";
import { dateToEpoch, convertDateToUtc } from "@/utils/datetime-utils";

import { updateReservationSchema } from "./update-reservation.validation";
import { validateFacilityBusinessHours } from "./validate-facility-business-hours";
import { validateCancelHoursWindow } from "./validate-cancel-hours";
import { validateReservationTimeWindow } from "./validate-reservation-time-window";
import { validateRsvpAvailability } from "./validate-rsvp-availability";

// implement FR-RSVP-013
//
export const updateReservationAction = baseClient
	.metadata({ name: "updateReservation" })
	.schema(updateReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			id,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			message,
		} = parsedInput;

		// Get session to check if user is logged in
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const sessionUserId = session?.user?.id;
		const sessionUserEmail = session?.user?.email;

		// Get the existing RSVP
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: {
					select: {
						id: true,
						name: true,
						defaultTimezone: true,
						useBusinessHours: true,
					},
				},
			},
		});

		if (!existingRsvp) {
			throw new SafeError("Reservation not found");
		}

		const storeId = existingRsvp.storeId;
		const storeTimezone = existingRsvp.Store?.defaultTimezone || "Asia/Taipei";

		// Fetch RsvpSettings for validations
		const rsvpSettingsResult = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
			select: {
				cancelHours: true,
				canCancel: true,
				defaultDuration: true,
				canReserveBefore: true,
				canReserveAfter: true,
				singleServiceMode: true,
			},
		});

		// Convert rsvpTime to UTC Date, then to BigInt epoch
		// The Date object from datetime-local input represents a time in the browser's local timezone
		// We need to interpret it as store timezone time and convert to UTC
		let rsvpTimeUtc: Date;
		try {
			rsvpTimeUtc = convertDateToUtc(rsvpTimeInput, storeTimezone);
		} catch (error) {
			throw new SafeError(
				error instanceof Error
					? error.message
					: "Failed to convert rsvpTime to UTC",
			);
		}

		const rsvpTime = dateToEpoch(rsvpTimeUtc);
		if (!rsvpTime) {
			throw new SafeError("Failed to convert rsvpTime to epoch");
		}

		// Verify ownership: user must be logged in and match customerId, or match by email
		let hasPermission = false;

		if (sessionUserId && existingRsvp.customerId) {
			hasPermission = existingRsvp.customerId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.Customer?.email) {
			hasPermission = existingRsvp.Customer.email === sessionUserEmail;
		}

		if (!hasPermission) {
			throw new SafeError(
				"You do not have permission to edit this reservation",
			);
		}

		// Set createdBy if it's currently null (for old records)
		const createdBy = sessionUserId || existingRsvp.createdBy || null;

		// Validate facility (required)
		if (!facilityId) {
			throw new SafeError("Facility is required");
		}

		const facility = await sqlClient.storeFacility.findFirst({
			where: {
				id: facilityId,
				storeId: existingRsvp.storeId,
			},
			select: {
				id: true,
				storeId: true,
				facilityName: true,
				defaultDuration: true,
				businessHours: true,
			},
		});

		if (!facility) {
			throw new SafeError("Facility not found");
		}

		// Validate cancelHours window (FR-RSVP-013)
		validateCancelHoursWindow(rsvpSettingsResult, rsvpTime, "modify");

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		validateReservationTimeWindow(rsvpSettingsResult, rsvpTime);

		// Validate business hours (if facility has business hours)
		validateFacilityBusinessHours(
			facility.businessHours,
			rsvpTimeUtc,
			storeTimezone,
			facilityId,
		);

		// Validate availability based on singleServiceMode (BR-RSVP-004)
		// Check if rsvpTime is different from existing reservation
		const existingRsvpTime = existingRsvp.rsvpTime;
		if (existingRsvpTime !== rsvpTime) {
			// Time changed, validate availability
			await validateRsvpAvailability(
				existingRsvp.storeId,
				rsvpSettingsResult,
				rsvpTime,
				facilityId,
				facility.defaultDuration,
				id, // Exclude current reservation from conflict check
			);
		}

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					facilityId,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
					confirmedByStore: false, // Reset confirmation when reservation is modified
					createdBy: createdBy || undefined, // Only update if we have a value
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Facility: true,
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation update failed.");
			}

			throw error;
		}
	});
