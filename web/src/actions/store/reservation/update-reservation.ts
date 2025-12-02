"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { RsvpStatus } from "@/types/enum";

import { updateReservationSchema } from "./update-reservation.validation";

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
		const sessionUserEmail = session?.user?.email;

		// Get the existing RSVP
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				User: true,
				Store: true,
			},
		});

		if (!existingRsvp) {
			throw new SafeError("Reservation not found");
		}

		// Only allow editing if status is Pending
		if (existingRsvp.status !== RsvpStatus.Pending) {
			throw new SafeError(
				"Reservation can only be edited when status is Pending",
			);
		}

		// Verify ownership: user must be logged in and match userId, or match by email
		let hasPermission = false;

		if (sessionUserId && existingRsvp.userId) {
			hasPermission = existingRsvp.userId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.User?.email) {
			hasPermission = existingRsvp.User.email === sessionUserEmail;
		}

		if (!hasPermission) {
			throw new SafeError(
				"You do not have permission to edit this reservation",
			);
		}

		// Validate facility if provided
		if (facilityId) {
			const facility = await sqlClient.storeFacility.findFirst({
				where: {
					id: facilityId,
					storeId: existingRsvp.storeId,
				},
			});

			if (!facility) {
				throw new SafeError("Facility not found");
			}
		}

		// TODO: Add availability validation (check existing reservations, business hours, etc.)

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					facilityId: facilityId || null,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
				},
				include: {
					Store: true,
					User: true,
					Facility: true,
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformDecimalsToNumbers(transformedRsvp);

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
