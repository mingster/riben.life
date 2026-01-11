import type { PrismaClient } from "@prisma/client";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { deduceCustomerCredit } from "./deduce-customer-credit";

interface CompleteRsvpCoreParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	rsvpId: string;
	storeId: string;
	previousStatus: RsvpStatus;
	existingRsvp: {
		id: string;
		storeId: string;
		status: RsvpStatus;
		alreadyPaid: boolean;
		customerId: string | null;
		facilityId: string | null;
		createdBy: string | null;
		Facility?: {
			id: string;
			defaultDuration: number | null;
		} | null;
	};
	store: {
		id: string;
		creditServiceExchangeRate: any;
		creditExchangeRate: any;
		defaultCurrency: string | null;
		useCustomerCredit: boolean | null;
	};
}

interface CompleteRsvpCoreResult {
	rsvp: Rsvp;
}

/**
 * Core logic for completing an RSVP within a transaction.
 * This function handles status update and credit deduction.
 * Should be called within a transaction context.
 */
export async function completeRsvpCore(
	params: CompleteRsvpCoreParams,
): Promise<CompleteRsvpCoreResult> {
	const { tx, rsvpId, previousStatus, existingRsvp, store } = params;

	// Update RSVP status to Completed
	const updatedRsvp = await tx.rsvp.update({
		where: { id: rsvpId },
		data: {
			status: RsvpStatus.Completed,
			updatedAt: getUtcNowEpoch(),
		},
		include: {
			Store: true,
			Customer: true,
			CreatedBy: true,
			Order: true,
			Facility: true,
			FacilityPricingRule: true,
			ServiceStaff: {
				include: {
					User: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
		},
	});

	// If RSVP was not already paid and facility exists, deduct customer credit
	// This handles service credit usage after service completion
	const wasCompleted = previousStatus === RsvpStatus.Completed;
	if (
		!wasCompleted &&
		!existingRsvp.alreadyPaid &&
		existingRsvp.customerId &&
		existingRsvp.Facility &&
		existingRsvp.facilityId &&
		store.creditServiceExchangeRate &&
		Number(store.creditServiceExchangeRate) > 0 &&
		store.creditExchangeRate &&
		Number(store.creditExchangeRate) > 0
	) {
		const duration = existingRsvp.Facility.defaultDuration || 60; // Default to 60 minutes if not set
		const creditServiceExchangeRate = Number(store.creditServiceExchangeRate);
		const creditExchangeRate = Number(store.creditExchangeRate);
		const defaultCurrency = store.defaultCurrency || "twd";

		await deduceCustomerCredit({
			tx,
			storeId: store.id,
			customerId: existingRsvp.customerId,
			rsvpId,
			facilityId: existingRsvp.Facility.id,
			duration,
			creditServiceExchangeRate,
			creditExchangeRate,
			defaultCurrency,
			createdBy: existingRsvp.createdBy || null,
		});
	}

	return {
		rsvp: updatedRsvp as Rsvp,
	};
}
