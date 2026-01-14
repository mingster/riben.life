"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { RsvpStatus } from "@/types/enum";

import { deleteReservationSchema } from "./delete-reservation.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { getT } from "@/app/i18n";

// delete pending reservation by the customer.
// this action will delete the pending reservation record and related pending store order.
//
// once the order is paid, reservation should be cancelled instead of deleted.
//
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

		// Get the existing RSVP with Order included to check payment status
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: true,
				Order: true,
			},
		});

		if (!existingRsvp) {
			const { t } = await getT();
			throw new SafeError(t("rsvp_not_found") || "Reservation not found");
		}

		// Once the order is paid, reservation should be cancelled instead of deleted
		if (existingRsvp.Order?.isPaid) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_paid_reservation_cannot_delete") ||
					"Paid reservations cannot be deleted. Please cancel instead.",
			);
		}

		// Only allow deletion if status is Pending
		if (
			existingRsvp.status !== RsvpStatus.Pending &&
			existingRsvp.status !== RsvpStatus.ReadyToConfirm
		) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_only_pending_can_delete") ||
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
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_no_permission_to_delete") ||
					"You do not have permission to delete this reservation",
			);
		}

		try {
			// Send notification before deletion
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: existingRsvp.id,
				storeId: existingRsvp.storeId,
				eventType: "deleted",
				customerId: existingRsvp.customerId,
				customerName: existingRsvp.Customer?.name || existingRsvp.name || null,
				customerEmail: existingRsvp.Customer?.email || null,
				customerPhone:
					existingRsvp.Customer?.phoneNumber || existingRsvp.phone || null,
				storeName: existingRsvp.Store?.name || null,
				rsvpTime: existingRsvp.rsvpTime,
				status: existingRsvp.status,
				actionUrl: `/storeAdmin/${existingRsvp.storeId}/rsvp`,
			});

			// Delete reservation and related pending order in a transaction
			await sqlClient.$transaction(async (tx) => {
				// Delete the related pending store order if it exists
				if (existingRsvp.orderId) {
					await tx.storeOrder.delete({
						where: { id: existingRsvp.orderId },
					});
				}

				// Delete the reservation record
				await tx.rsvp.delete({
					where: { id },
				});
			});

			return { id };
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_deletion_failed") || "Reservation deletion failed.",
				);
			}

			throw error;
		}
	});
