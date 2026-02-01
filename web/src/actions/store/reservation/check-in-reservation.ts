"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { checkInReservationSchema } from "./check-in-reservation.validation";

const ALLOWED_STATUSES_FOR_CHECK_IN = [
	RsvpStatus.Ready,
	RsvpStatus.ReadyToConfirm,
] as const;

/**
 * Check in a reservation (QR code or manual code).
 * No auth required - used by customer at kiosk or on their device.
 * Idempotent: if already CheckedIn or Completed, returns success with alreadyCheckedIn.
 */
export const checkInReservationAction = baseClient
	.metadata({ name: "checkInReservation" })
	.schema(checkInReservationSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, rsvpId } = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id: rsvpId },
			include: {
				Store: true,
				Customer: true,
				Facility: true,
				ServiceStaff: {
					include: {
						User: { select: { name: true, email: true } },
					},
				},
			},
		});

		if (!rsvp) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_checkin_not_found") || "Reservation not found.",
			);
		}

		if (rsvp.storeId !== storeId) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_checkin_store_mismatch") ||
					"Reservation does not belong to this store.",
			);
		}

		// Idempotent: already checked in or completed
		if (
			rsvp.status === RsvpStatus.CheckedIn ||
			rsvp.status === RsvpStatus.Completed
		) {
			const transformed = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformed);
			return {
				success: true,
				alreadyCheckedIn: true,
				rsvp: transformed,
			};
		}

		if (!ALLOWED_STATUSES_FOR_CHECK_IN.includes(rsvp.status as number)) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_checkin_status_not_allowed") ||
					"This reservation cannot be checked in at this time.",
			);
		}

		const previousStatus = rsvp.status;
		const now = getUtcNowEpoch();

		const updated = await sqlClient.rsvp.update({
			where: { id: rsvpId },
			data: {
				status: RsvpStatus.CheckedIn,
				checkedInAt: now,
				updatedAt: now,
			},
			include: {
				Store: true,
				Customer: true,
				Facility: true,
				ServiceStaff: {
					include: {
						User: { select: { name: true, email: true } },
					},
				},
			},
		});

		const transformedRsvp = { ...updated } as Rsvp;
		transformPrismaDataForJson(transformedRsvp);

		const notificationRouter = getRsvpNotificationRouter();
		await notificationRouter.routeNotification({
			rsvpId: updated.id,
			storeId: updated.storeId,
			eventType: "status_changed",
			customerId: updated.customerId ?? null,
			customerName: updated.Customer?.name ?? updated.name ?? null,
			customerEmail: updated.Customer?.email ?? null,
			customerPhone: updated.Customer?.phoneNumber ?? updated.phone ?? null,
			storeName: updated.Store?.name ?? null,
			storeOwnerId: updated.Store?.ownerId ?? null,
			rsvpTime: updated.rsvpTime,
			arriveTime: updated.arriveTime,
			status: updated.status,
			previousStatus,
			facilityName: updated.Facility?.facilityName ?? null,
			serviceStaffName:
				updated.ServiceStaff?.User?.name ??
				updated.ServiceStaff?.User?.email ??
				null,
			numOfAdult: updated.numOfAdult,
			numOfChild: updated.numOfChild,
			message: updated.message ?? null,
			actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
		});

		return {
			success: true,
			alreadyCheckedIn: false,
			rsvp: transformedRsvp,
		};
	});
