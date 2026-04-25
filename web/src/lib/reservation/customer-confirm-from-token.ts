import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import type { NotificationLocale } from "@/lib/notification/rsvp-notification-router";
import { queueRsvpGoogleCalendarSync } from "@/lib/google-calendar/sync-rsvp-to-google-calendar";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { verifyRsvpCustomerConfirmToken } from "@/utils/rsvp-customer-confirm-token";

export type RunCustomerRsvpConfirmResult =
	| { kind: "success" }
	| { kind: "already" }
	| { kind: "invalid_token" }
	| { kind: "wrong_store" }
	| { kind: "invalid_status" }
	| { kind: "missing_token" };

/**
 * Validates the signed token and promotes RSVP Ready -> ConfirmedByCustomer
 * with confirmedByCustomer=true. Idempotent if already confirmed.
 */
export async function runCustomerRsvpConfirm(params: {
	token?: string | null;
	storeIdFromRoute: string;
}): Promise<RunCustomerRsvpConfirmResult> {
	const raw = params.token?.trim();
	if (!raw) {
		return { kind: "missing_token" };
	}

	const payload = verifyRsvpCustomerConfirmToken(raw);
	if (!payload) {
		return { kind: "invalid_token" };
	}

	if (payload.storeId !== params.storeIdFromRoute) {
		return { kind: "wrong_store" };
	}

	const now = getUtcNowEpoch();

	const outcome = await sqlClient.$transaction(async (tx) => {
		const cur = await tx.rsvp.findUnique({
			where: { id: payload.rsvpId },
			select: {
				id: true,
				storeId: true,
				status: true,
				confirmedByCustomer: true,
			},
		});

		if (!cur || cur.storeId !== payload.storeId) {
			return "invalid_token" as const;
		}

		if (
			cur.status === RsvpStatus.ConfirmedByCustomer &&
			cur.confirmedByCustomer
		) {
			return "already" as const;
		}

		if (cur.status !== RsvpStatus.Ready) {
			return "invalid_status" as const;
		}

		await tx.rsvp.update({
			where: { id: payload.rsvpId },
			data: {
				status: RsvpStatus.ConfirmedByCustomer,
				confirmedByCustomer: true,
				updatedAt: now,
			},
		});

		return "updated" as const;
	});

	if (outcome === "invalid_token") return { kind: "invalid_token" };
	if (outcome === "already") return { kind: "already" };
	if (outcome === "invalid_status") return { kind: "invalid_status" };

	queueRsvpGoogleCalendarSync(payload.rsvpId);

	const rsvp = await sqlClient.rsvp.findUnique({
		where: { id: payload.rsvpId },
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
		return { kind: "invalid_token" };
	}

	const router = getRsvpNotificationRouter();

	const rsvpName = rsvp.name?.trim();
	const customerNameFromUser = rsvp.Customer?.name?.trim();
	const customerName =
		rsvpName && rsvpName.toLowerCase() !== "anonymous"
			? rsvpName
			: customerNameFromUser &&
					customerNameFromUser.toLowerCase() !== "anonymous"
				? customerNameFromUser
				: rsvpName || customerNameFromUser || null;

	const customerLocale =
		(rsvp.Customer?.locale as NotificationLocale | undefined) ?? "en";

	const baseContext = {
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
		previousStatus: RsvpStatus.Ready,
		facilityName: rsvp.Facility?.facilityName ?? null,
		serviceStaffName:
			rsvp.ServiceStaff?.User?.name || rsvp.ServiceStaff?.User?.email || null,
		numOfAdult: rsvp.numOfAdult,
		numOfChild: rsvp.numOfChild,
		message: rsvp.message ?? null,
		locale: customerLocale,
		actionUrl: `/storeAdmin/${rsvp.storeId}/rsvp/history`,
	};

	await router.routeNotification({
		...baseContext,
		eventType: "confirmed_by_customer",
	});

	return { kind: "success" };
}
