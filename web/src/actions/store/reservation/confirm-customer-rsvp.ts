"use server";

import {
	confirmCustomerRsvpSchema,
	type ConfirmCustomerRsvpInput,
} from "@/actions/store/reservation/confirm-customer-rsvp.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { queueRsvpGoogleCalendarSync } from "@/lib/google-calendar/sync-rsvp-to-google-calendar";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { getRsvpConversationMessage } from "@/utils/rsvp-conversation-utils";
import { userRequiredActionClient } from "@/utils/actions/safe-action";

export const confirmCustomerRsvpAction = userRequiredActionClient
	.metadata({ name: "confirmCustomerRsvp" })
	.schema(confirmCustomerRsvpSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { rsvpId } = parsedInput as ConfirmCustomerRsvpInput;
		const userId = ctx.userId;
		const now = getUtcNowEpoch();

		const updateResult = await sqlClient.$transaction(async (tx) => {
			const current = await tx.rsvp.findUnique({
				where: { id: rsvpId },
				select: {
					id: true,
					storeId: true,
					customerId: true,
					status: true,
					confirmedByCustomer: true,
				},
			});

			if (!current) {
				throw new SafeError("Reservation not found");
			}

			if (!current.customerId || current.customerId !== userId) {
				throw new SafeError("Unauthorized");
			}

			if (
				current.status === RsvpStatus.ConfirmedByCustomer &&
				current.confirmedByCustomer
			) {
				return { kind: "already" as const, previousStatus: current.status };
			}

			if (current.status !== RsvpStatus.Ready) {
				throw new SafeError("Reservation is not ready for confirmation");
			}

			await tx.rsvp.update({
				where: { id: rsvpId },
				data: {
					status: RsvpStatus.ConfirmedByCustomer,
					confirmedByCustomer: true,
					updatedAt: now,
				},
			});

			return { kind: "updated" as const, previousStatus: current.status };
		});

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id: rsvpId },
			include: {
				Store: { select: { name: true, ownerId: true } },
				Customer: {
					select: { name: true, email: true, phoneNumber: true, locale: true },
				},
				Facility: { select: { facilityName: true } },
				ServiceStaff: {
					include: {
						User: { select: { name: true, email: true } },
					},
				},
			},
		});

		if (!rsvp) {
			throw new SafeError("Reservation not found");
		}

		if (updateResult.kind === "updated") {
			const router = getRsvpNotificationRouter();
			const customerNameFromRsvp = rsvp.name?.trim();
			const customerNameFromUser = rsvp.Customer?.name?.trim();
			const customerName =
				customerNameFromRsvp &&
				customerNameFromRsvp.toLowerCase() !== "anonymous"
					? customerNameFromRsvp
					: customerNameFromUser &&
							customerNameFromUser.toLowerCase() !== "anonymous"
						? customerNameFromUser
						: customerNameFromRsvp || customerNameFromUser || null;

			const customerLocale =
				(rsvp.Customer?.locale as "en" | "tw" | "jp" | undefined) ?? "en";

			await router.routeNotification({
				eventType: "confirmed_by_customer",
				rsvpId: rsvp.id,
				storeId: rsvp.storeId,
				checkInCode: rsvp.checkInCode ?? null,
				customerId: rsvp.customerId,
				customerName,
				customerEmail: rsvp.Customer?.email ?? null,
				customerPhone: rsvp.Customer?.phoneNumber ?? rsvp.phone ?? null,
				storeName: rsvp.Store?.name ?? null,
				storeOwnerId: rsvp.Store?.ownerId ?? null,
				rsvpTime: rsvp.rsvpTime,
				status: RsvpStatus.ConfirmedByCustomer,
				previousStatus: updateResult.previousStatus,
				facilityName: rsvp.Facility?.facilityName ?? null,
				serviceStaffName:
					rsvp.ServiceStaff?.User?.name ||
					rsvp.ServiceStaff?.User?.email ||
					null,
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				message: getRsvpConversationMessage(rsvp),
				locale: customerLocale,
				actionUrl: `/storeAdmin/${rsvp.storeId}/rsvp/history`,
			});

			queueRsvpGoogleCalendarSync(rsvp.id);
		}

		return {
			rsvp,
			alreadyConfirmed: updateResult.kind === "already",
		};
	});
