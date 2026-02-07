"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { checkInRsvpSchema } from "./check-in-rsvp.validation";

const ALLOWED_STATUSES_FOR_CHECK_IN = [
	RsvpStatus.Ready,
	RsvpStatus.ReadyToConfirm,
] as const;

/**
 * Check in an RSVP (staff only). Accepts 8-digit check-in code or rsvpId.
 * Idempotent: if already CheckedIn or Completed, returns success with alreadyCheckedIn.
 */
export const checkInRsvpAction = storeActionClient
	.metadata({ name: "checkInRsvp" })
	.schema(checkInRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { rsvpId: inputRsvpId, checkInCode: inputCheckInCode } = parsedInput;

		const hasCheckInCode =
			inputCheckInCode != null && inputCheckInCode.trim() !== "";
		const hasRsvpId = inputRsvpId != null && inputRsvpId.trim() !== "";

		const includeRelations = {
			Store: true,
			Customer: true,
			Facility: true,
			ServiceStaff: {
				include: {
					User: { select: { name: true, email: true } },
				},
			},
		};

		let rsvp = null as Awaited<
			ReturnType<
				typeof sqlClient.rsvp.findFirst<{
					include: typeof includeRelations;
				}>
			>
		>;

		if (hasCheckInCode) {
			rsvp = await sqlClient.rsvp.findFirst({
				where: {
					storeId,
					checkInCode: inputCheckInCode!.trim(),
				},
				include: includeRelations,
			});
		} else if (hasRsvpId) {
			const found = await sqlClient.rsvp.findUnique({
				where: { id: inputRsvpId!.trim() },
				include: includeRelations,
			});
			if (found != null && found.storeId === storeId) {
				rsvp = found;
			}
		}

		if (!rsvp) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_checkin_not_found") || "Reservation not found.",
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
			where: { id: rsvp.id },
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
			checkInCode: updated.checkInCode ?? null,
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
