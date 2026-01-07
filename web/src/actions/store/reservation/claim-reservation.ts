"use server";

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";

const claimReservationSchema = z.object({
	id: z.string().min(1, "Reservation ID is required"),
});

// Claim an anonymous reservation by linking it to the current user
// This is called when a user signs in and has reservations in local storage
export const claimReservationAction = baseClient
	.metadata({ name: "claimReservation" })
	.schema(claimReservationSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

		// Get session to check if user is logged in
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const sessionUserId = session?.user?.id;

		if (!sessionUserId) {
			throw new SafeError("You must be signed in to claim a reservation");
		}

		// Get the existing RSVP
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: {
				id: true,
				storeId: true,
				customerId: true,
				name: true,
				phone: true,
				createdBy: true,
			},
		});

		if (!existingRsvp) {
			throw new SafeError("Reservation not found");
		}

		// Only allow claiming if reservation is currently anonymous (customerId is null)
		if (existingRsvp.customerId) {
			// Reservation already has a customer - check if it's the current user
			if (existingRsvp.customerId === sessionUserId) {
				// Already claimed by this user, return success
				return { success: true, alreadyClaimed: true };
			}
			throw new SafeError(
				"This reservation is already linked to another account",
			);
		}

		// Claim the reservation by updating customerId
		try {
			await sqlClient.rsvp.update({
				where: { id },
				data: {
					customerId: sessionUserId,
					// Clear name and phone since they're no longer needed (user is now linked)
					name: null,
					phone: null,
					// Set createdBy if it's currently null
					createdBy: existingRsvp.createdBy || sessionUserId,
					updatedAt: getUtcNowEpoch(),
				},
			});

			logger.info("Reservation claimed by user", {
				metadata: {
					reservationId: id,
					userId: sessionUserId,
					storeId: existingRsvp.storeId,
				},
				tags: ["rsvp", "claim", "anonymous"],
			});

			return { success: true, alreadyClaimed: false };
		} catch (error) {
			logger.error("Failed to claim reservation", {
				metadata: {
					reservationId: id,
					userId: sessionUserId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["rsvp", "claim", "error"],
			});
			throw error;
		}
	});
