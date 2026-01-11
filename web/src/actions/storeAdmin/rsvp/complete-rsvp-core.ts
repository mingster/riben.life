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

	// Determine if credit deduction is needed
	const wasCompleted = previousStatus === RsvpStatus.Completed;
	const needsCreditDeduction =
		!wasCompleted &&
		!existingRsvp.alreadyPaid &&
		existingRsvp.customerId &&
		existingRsvp.Facility &&
		existingRsvp.facilityId &&
		store.creditServiceExchangeRate &&
		Number(store.creditServiceExchangeRate) > 0 &&
		store.creditExchangeRate &&
		Number(store.creditExchangeRate) > 0;

	// CRITICAL: Deduct credit BEFORE updating status to ensure atomicity
	// If credit deduction fails, the status update will not happen (transaction rollback)
	if (needsCreditDeduction && existingRsvp.Facility && existingRsvp.customerId && existingRsvp.facilityId) {
		const duration = existingRsvp.Facility.defaultDuration || 60; // Default to 60 minutes if not set
		const creditServiceExchangeRate = Number(store.creditServiceExchangeRate);
		const creditExchangeRate = Number(store.creditExchangeRate);
		const defaultCurrency = store.defaultCurrency || "twd";

		const creditResult = await deduceCustomerCredit({
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

		// If credit deduction failed, throw error to roll back the transaction
		// This ensures both operations succeed or fail together
		if (!creditResult.success) {
			// Calculate credit that would have been deducted for error message
			const creditToDeduct = duration / creditServiceExchangeRate;

			throw new Error(
				creditResult.insufficientBalance
					? `Insufficient credit balance for RSVP completion. Required: ${creditToDeduct}, Available: ${creditResult.balanceBefore}`
					: "Credit deduction failed for RSVP completion",
			);
		}
	}

	// Only update RSVP status to Completed if credit deduction succeeded (or wasn't needed)
	// This ensures atomicity: both status update and credit deduction succeed or fail together
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

	return {
		rsvp: updatedRsvp as Rsvp,
	};
}
