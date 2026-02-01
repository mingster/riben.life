"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { completeRsvpSchema } from "./complete-rsvp.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { completeRsvpCore } from "./complete-rsvp-core";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

// Store admin can complete any RSVP in their store.
// When completing an RSVP, the system handles three different cases:
//
// Case 1: Prepaid RSVP with credit points (alreadyPaid = true, payment method = "creditPoint")
//   - Converts HOLD ledger entry to SPEND (CustomerCreditLedgerType)
//   - Creates StoreLedger entry with type StorePaymentProvider for revenue recognition
//   - Updates RSVP status to Completed
//
// Case 2: Prepaid RSVP with external payment (alreadyPaid = true, payment method != "creditPoint")
//   - Converts HOLD ledger entry to PAYMENT (CustomerFiatLedger.type = "PAYMENT")
//   - No need to deduct fiat since it's already held
//   - Creates StoreLedger entry with type StorePaymentProvider for revenue recognition
//   - Updates RSVP status to Completed
//
// Case 3: Non-prepaid RSVP (alreadyPaid = false)
//   - Deducts credit points directly (creates SPEND entry in CustomerCreditLedger)
//   - Creates StoreLedger entry with type StorePaymentProvider for revenue recognition
//   - Updates RSVP status to Completed
//
// Shared implementation used by completeRsvpAction and by LINE webhook "complete" command.
// Caller is responsible for validating store access (session or staff check).
export async function completeRsvpById(
	storeId: string,
	rsvpId: string,
): Promise<{ rsvp: Rsvp }> {
	// Get the existing RSVP with Facility and Order included
	const existingRsvp = await sqlClient.rsvp.findUnique({
		where: { id: rsvpId },
		include: {
			Customer: true,
			Store: true,
			Facility: {
				select: {
					id: true,
					defaultDuration: true,
				},
			},
			Order: {
				select: {
					id: true,
					PaymentMethod: {
						select: {
							payUrl: true,
						},
					},
				},
			},
		},
	});

	const { t } = await getT();

	if (!existingRsvp) {
		throw new SafeError(t("rsvp_reservation_not_found") || "RSVP not found");
	}

	// Validate store context: ensure reservation belongs to the specified store
	if (existingRsvp.storeId !== storeId) {
		throw new SafeError(
			t("rsvp_reservation_not_belong_to_store") ||
				"RSVP does not belong to the specified store",
		);
	}

	// Check if RSVP is already completed
	if (existingRsvp.status === RsvpStatus.Completed) {
		throw new SafeError(
			t("rsvp_already_completed") || "RSVP is already completed",
		);
	}

	// Only allow completing RSVPs that are in Ready or CheckedIn status
	if (
		existingRsvp.status !== RsvpStatus.Ready &&
		existingRsvp.status !== RsvpStatus.CheckedIn
	) {
		throw new SafeError(
			t("rsvp_can_only_complete_ready") ||
				"Only RSVPs in Ready or Checked In status can be completed",
		);
	}

	// Verify store exists and get credit settings
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			id: true,
			creditServiceExchangeRate: true,
			creditExchangeRate: true,
			defaultCurrency: true,
			useCustomerCredit: true,
		},
	});

	if (!store) {
		throw new SafeError(t("rsvp_store_not_found") || "Store not found");
	}

	const previousStatus = existingRsvp.status;

	logger.info("Completing RSVP (store admin)", {
		metadata: {
			rsvpId,
			storeId,
			previousStatus,
			alreadyPaid: existingRsvp.alreadyPaid,
			customerId: existingRsvp.customerId,
			facilityId: existingRsvp.facilityId,
		},
		tags: ["rsvp", "completion", "store-admin"],
	});

	try {
		const updated = await sqlClient.$transaction(async (tx) => {
			const result = await completeRsvpCore({
				tx,
				rsvpId,
				storeId,
				previousStatus,
				existingRsvp: {
					id: existingRsvp.id,
					storeId: existingRsvp.storeId,
					status: existingRsvp.status,
					alreadyPaid: existingRsvp.alreadyPaid,
					customerId: existingRsvp.customerId,
					facilityId: existingRsvp.facilityId,
					orderId: existingRsvp.orderId,
					createdBy: existingRsvp.createdBy,
					Facility: existingRsvp.Facility,
					Order: existingRsvp.Order,
				},
				store: {
					id: store.id,
					creditServiceExchangeRate: store.creditServiceExchangeRate,
					creditExchangeRate: store.creditExchangeRate,
					defaultCurrency: store.defaultCurrency,
					useCustomerCredit: store.useCustomerCredit,
				},
			});

			return result.rsvp;
		});

		const transformedRsvp = { ...updated } as Rsvp;
		transformPrismaDataForJson(transformedRsvp);

		// Send notification to customer for RSVP completion
		const notificationRouter = getRsvpNotificationRouter();
		await notificationRouter.routeNotification({
			rsvpId: updated.id,
			storeId: updated.storeId,
			eventType: "completed",
			customerId: updated.customerId || null,
			customerName: updated.Customer?.name || null,
			customerEmail: updated.Customer?.email || null,
			customerPhone: updated.Customer?.phoneNumber || null,
			storeName: updated.Store?.name || null,
			rsvpTime: updated.rsvpTime,
			arriveTime: updated.arriveTime,
			status: updated.status,
			previousStatus: previousStatus,
			facilityName: updated.Facility?.facilityName || null,
			serviceStaffName:
				updated.ServiceStaff?.User?.name ||
				updated.ServiceStaff?.User?.email ||
				null,
			numOfAdult: updated.numOfAdult,
			numOfChild: updated.numOfChild,
			message: updated.message || null,
			actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
		});

		return {
			rsvp: transformedRsvp,
		};
	} catch (error: unknown) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_completion_failed") || "RSVP completion failed.",
			);
		}

		throw error;
	}
}

export const completeRsvpAction = storeActionClient
	.metadata({ name: "completeRsvp" })
	.schema(completeRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;
		return completeRsvpById(storeId, id);
	});
