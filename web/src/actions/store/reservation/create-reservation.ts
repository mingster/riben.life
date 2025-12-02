"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUtcNow } from "@/utils/datetime-utils";

import { createReservationSchema } from "./create-reservation.validation";
import { RsvpStatus } from "@/types/enum";

export const createReservationAction = baseClient
	.metadata({ name: "createReservation" })
	.schema(createReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			userId,
			email,
			phone,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			message,
		} = parsedInput;

		// Convert rsvpTime to UTC if it's a Date object
		// datetime-local inputs create Date objects in user's local timezone
		// We need to ensure it's stored as UTC in the database
		const rsvpTime =
			rsvpTimeInput instanceof Date
				? new Date(
						Date.UTC(
							rsvpTimeInput.getFullYear(),
							rsvpTimeInput.getMonth(),
							rsvpTimeInput.getDate(),
							rsvpTimeInput.getHours(),
							rsvpTimeInput.getMinutes(),
							rsvpTimeInput.getSeconds(),
							rsvpTimeInput.getMilliseconds(),
						),
					)
				: rsvpTimeInput;

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
				},
			}),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId },
			}),
		]);

		if (!store) {
			throw new SafeError("Store not found");
		}

		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			throw new SafeError("Reservations are not currently accepted");
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

		// Use session userId if available, otherwise use provided userId
		const finalUserId = sessionUserId || userId || null;

		// Validate facility if provided
		if (facilityId) {
			const facility = await sqlClient.storeFacility.findFirst({
				where: {
					id: facilityId,
					storeId,
				},
			});

			if (!facility) {
				throw new SafeError("Facility not found");
			}
		}

		// TODO: Add availability validation (check existing reservations, business hours, etc.)

		try {
			const rsvp = await sqlClient.rsvp.create({
				data: {
					storeId,
					userId: finalUserId,
					facilityId: facilityId || null,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
					status: Number(RsvpStatus.Pending), // pending
					alreadyPaid: false,
					confirmedByStore: false,
					confirmedByCustomer: false,
				},
				include: {
					Store: true,
					User: true,
					Facility: true,
				},
			});

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformDecimalsToNumbers(transformedRsvp);

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
