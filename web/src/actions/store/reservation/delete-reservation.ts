"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { RsvpStatus } from "@/types/enum";

import { deleteReservationSchema } from "./delete-reservation.validation";

export const deleteReservationAction = baseClient
	.metadata({ name: "deleteReservation" })
	.schema(deleteReservationSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

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
				Store: true,
			},
		});

		if (!existingRsvp) {
			throw new SafeError("Reservation not found");
		}

		// Only allow deletion if status is Pending
		if (
			existingRsvp.status !== RsvpStatus.Pending &&
			existingRsvp.status !== RsvpStatus.ReadyToConfirm
		) {
			throw new SafeError(
				"Only pending reservations can be deleted. Please cancel instead.",
			);
		}

		// Simplified logic: If status is Pending or ReadyToConfirm, allow deletion if:
		// 1. User is logged in and matches customerId, OR
		// 2. User is anonymous (no session) - they can only see/click delete if it's their reservation
		// The client-side canCancelReservation already checks ownership, so we trust that here
		let hasPermission = false;

		// Check if user is logged in and matches customerId or email
		if (sessionUserId && existingRsvp.customerId) {
			hasPermission = existingRsvp.customerId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.Customer?.email) {
			hasPermission = existingRsvp.Customer.email === sessionUserEmail;
		} else if (!sessionUserId) {
			// Anonymous user: If status is Pending/ReadyToConfirm, allow deletion
			// The client-side canCancelReservation already verified ownership via isUserReservation
			// which checks if the reservation is in local storage for anonymous users

			if (
				existingRsvp.status === RsvpStatus.Pending ||
				existingRsvp.status === RsvpStatus.ReadyToConfirm
			) {
				hasPermission = true;
			}
		}

		if (!hasPermission) {
			throw new SafeError(
				"You do not have permission to delete this reservation",
			);
		}

		try {
			// Hard delete from database
			await sqlClient.rsvp.delete({
				where: { id },
			});

			return { id };
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation deletion failed.");
			}

			throw error;
		}
	});
