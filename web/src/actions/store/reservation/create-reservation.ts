"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	dateToEpoch,
	getUtcNowEpoch,
	convertDateToUtc,
} from "@/utils/datetime-utils";

import { createReservationSchema } from "./create-reservation.validation";
import { RsvpStatus } from "@/types/enum";

export const createReservationAction = baseClient
	.metadata({ name: "createReservation" })
	.schema(createReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			customerId,
			email,
			phone,
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

		// Get store and RSVP settings
		const [store, rsvpSettings] = await Promise.all([
			sqlClient.store.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					name: true,
					useBusinessHours: true,
					defaultTimezone: true,
				},
			}),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId },
			}),
		]);

		if (!store) {
			throw new SafeError("Store not found");
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			throw new SafeError("Reservations are not currently accepted");
		}

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

		// Check if prepaid is required
		if (rsvpSettings.prepaidRequired) {
			if (!sessionUserId) {
				throw new SafeError(
					"Please sign in to make a reservation. Prepaid is required.",
				);
			}
			// TODO: Handle prepaid payment logic here
			// For now, we'll just create the reservation without payment
		}

		// Validate email requirement for anonymous users
		if (!sessionUserId && !email) {
			throw new SafeError("Email is required for reservations");
		}

		// Use session userId if available, otherwise use provided customerId
		const finalCustomerId = sessionUserId || customerId || null;

		// Check if user is blacklisted (only for logged-in users)
		if (finalCustomerId) {
			const isBlacklisted = await sqlClient.rsvpBlacklist.findFirst({
				where: {
					storeId,
					userId: finalCustomerId,
				},
			});

			if (isBlacklisted) {
				throw new SafeError("You are not allowed to create reservations");
			}
		}

		// Validate facility (required)
		if (!facilityId) {
			throw new SafeError("Facility is required");
		}

		const facility = await sqlClient.storeFacility.findFirst({
			where: {
				id: facilityId,
				storeId,
			},
		});

		if (!facility) {
			throw new SafeError("Facility not found");
		}

		// TODO: Add availability validation (check existing reservations, business hours, etc.)

		try {
			const rsvp = await sqlClient.rsvp.create({
				data: {
					storeId,
					customerId: finalCustomerId,
					facilityId,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
					status: Number(RsvpStatus.Pending), // pending
					alreadyPaid: false,
					confirmedByStore: false,
					confirmedByCustomer: false,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Store: true,
					Customer: true,
					Facility: true,
				},
			});

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation already exists.");
			}

			throw error;
		}
	});
