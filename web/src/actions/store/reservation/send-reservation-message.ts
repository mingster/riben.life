"use server";

import { getT } from "@/app/i18n";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendReservationMessageSchema } from "./send-reservation-message.validation";

export const sendReservationMessageAction = baseClient
	.metadata({ name: "sendReservationMessage" })
	.schema(sendReservationMessageSchema)
	.action(async ({ parsedInput }) => {
		const { id, message } = parsedInput;
		const messageText = message.trim();
		const { t } = await getT();

		if (!messageText) {
			throw new SafeError(t("rsvp_message_required") || "Message is required");
		}

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const sessionUserId = session?.user?.id;
		const sessionUserEmail = session?.user?.email;

		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: {
					select: {
						id: true,
						name: true,
					},
				},
				Facility: true,
			},
		});

		if (!existingRsvp) {
			throw new SafeError(
				t("rsvp_reservation_not_found") || "Reservation not found",
			);
		}

		let hasPermission = false;
		if (sessionUserId && existingRsvp.customerId) {
			hasPermission = existingRsvp.customerId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.Customer?.email) {
			hasPermission = existingRsvp.Customer.email === sessionUserEmail;
		} else if (!sessionUserId) {
			if (
				existingRsvp.status === RsvpStatus.Pending ||
				existingRsvp.status === RsvpStatus.ReadyToConfirm
			) {
				hasPermission = true;
			}
		}

		if (!hasPermission) {
			throw new SafeError(
				t("rsvp_no_permission_to_edit") ||
					"You do not have permission to edit this reservation",
			);
		}

		const now = getUtcNowEpoch();
		await sqlClient.$transaction(async (tx) => {
			const conversation = await tx.rsvpConversation.upsert({
				where: { rsvpId: id },
				update: {
					lastMessageAt: now,
					updatedAt: now,
				},
				create: {
					rsvpId: id,
					storeId: existingRsvp.storeId,
					customerId: existingRsvp.customerId,
					lastMessageAt: now,
					createdAt: now,
					updatedAt: now,
				},
				select: { id: true },
			});

			await tx.rsvpConversationMessage.create({
				data: {
					conversationId: conversation.id,
					rsvpId: id,
					storeId: existingRsvp.storeId,
					senderUserId: sessionUserId ?? existingRsvp.customerId,
					senderType: "customer",
					message: messageText,
					createdAt: now,
					updatedAt: now,
				},
			});
		});

		const notificationRouter = getRsvpNotificationRouter();
		await notificationRouter.routeNotification({
			rsvpId: existingRsvp.id,
			storeId: existingRsvp.storeId,
			eventType: "updated",
			customerId: existingRsvp.customerId,
			customerName: existingRsvp.Customer?.name || existingRsvp.name || null,
			customerEmail: existingRsvp.Customer?.email || null,
			customerPhone:
				existingRsvp.Customer?.phoneNumber || existingRsvp.phone || null,
			storeName: existingRsvp.Store?.name || null,
			rsvpTime: existingRsvp.rsvpTime,
			status: existingRsvp.status,
			facilityName: existingRsvp.Facility?.facilityName || null,
			numOfAdult: existingRsvp.numOfAdult,
			numOfChild: existingRsvp.numOfChild,
			message: messageText,
			actionUrl: `/storeAdmin/${existingRsvp.storeId}/rsvp`,
		});

		return { success: true };
	});
