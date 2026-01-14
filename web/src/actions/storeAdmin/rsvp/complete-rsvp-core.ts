import type { PrismaClient, Prisma } from "@prisma/client";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { deduceCustomerCredit } from "./deduce-customer-credit";
import { convertHoldToSpend } from "./convert-hold-to-spend";
import { convertFiatTopupToPayment } from "./convert-fiat-topup-to-payment";

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
		orderId: string | null;
		createdBy: string | null;
		Facility?: {
			id: string;
			defaultDuration: number | null;
		} | null;
		Order?: {
			id: string;
			PaymentMethod?: {
				payUrl: string | null;
			} | null;
		} | null;
	};
	store: {
		id: string;
		creditServiceExchangeRate: Prisma.Decimal | null;
		creditExchangeRate: Prisma.Decimal | null;
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

	// Determine if credit processing is needed
	const wasCompleted = previousStatus === RsvpStatus.Completed;

	// Case 1: Prepaid RSVP with credit points (alreadyPaid = true, payment method = "creditPoint") - Convert HOLD to SPEND
	const needsHoldConversion =
		!wasCompleted &&
		existingRsvp.alreadyPaid &&
		existingRsvp.orderId &&
		existingRsvp.customerId &&
		existingRsvp.Order?.PaymentMethod?.payUrl === "creditPoint" &&
		store.creditExchangeRate &&
		Number(store.creditExchangeRate) > 0;

	// Case 2: Prepaid RSVP with external payment (alreadyPaid = true, payment method != "creditPoint") - Convert TOPUP to PAYMENT
	const needsFiatConversion =
		!wasCompleted &&
		existingRsvp.alreadyPaid &&
		existingRsvp.orderId &&
		existingRsvp.customerId &&
		existingRsvp.Order?.PaymentMethod?.payUrl !== "creditPoint" &&
		existingRsvp.Order?.PaymentMethod?.payUrl !== null;

	// Case 3: Non-prepaid RSVP (alreadyPaid = false) - Deduct credit for service usage
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

	// CRITICAL: Process credit BEFORE updating status to ensure atomicity
	// If credit processing fails, the status update will not happen (transaction rollback)
	if (needsHoldConversion && existingRsvp.orderId && existingRsvp.customerId) {
		// Convert HOLD to SPEND and create StoreLedger entry for revenue recognition
		const creditExchangeRate = Number(store.creditExchangeRate);
		const defaultCurrency = store.defaultCurrency || "twd";

		await convertHoldToSpend({
			tx,
			storeId: store.id,
			customerId: existingRsvp.customerId,
			rsvpId,
			orderId: existingRsvp.orderId,
			creditExchangeRate,
			defaultCurrency,
			createdBy: existingRsvp.createdBy || null,
		});
	} else if (
		needsFiatConversion &&
		existingRsvp.orderId &&
		existingRsvp.customerId
	) {
		// Convert TOPUP to PAYMENT and create StoreLedger entry for revenue recognition
		const defaultCurrency = store.defaultCurrency || "twd";

		await convertFiatTopupToPayment({
			tx,
			storeId: store.id,
			customerId: existingRsvp.customerId,
			rsvpId,
			orderId: existingRsvp.orderId,
			defaultCurrency,
			createdBy: existingRsvp.createdBy || null,
		});
	} else if (
		needsCreditDeduction &&
		existingRsvp.Facility &&
		existingRsvp.customerId &&
		existingRsvp.facilityId
	) {
		// Deduct credit for service usage (non-prepaid RSVP)
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
