"use server";

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { StoreLedgerType, CustomerCreditLedgerType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";

interface ConvertFiatTopupToPaymentParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	rsvpId: string;
	orderId: string;
	defaultCurrency: string;
	createdBy?: string | null;
}

/**
 * Converts HOLD fiat ledger entry to SPEND and creates StoreLedger entry for revenue recognition.
 * This function should be called when a prepaid RSVP (paid with external payment) is completed.
 * No need to deduct fiat since it's already held - just convert HOLD to SPEND.
 */
export async function convertFiatTopupToPayment(
	params: ConvertFiatTopupToPaymentParams,
): Promise<void> {
	const {
		tx,
		storeId,
		customerId,
		rsvpId,
		orderId,
		defaultCurrency,
		createdBy = null,
	} = params;

	// Find the original HOLD ledger entry for this order
	const holdEntry = await tx.customerFiatLedger.findFirst({
		where: {
			storeId,
			userId: customerId,
			referenceId: orderId,
			type: CustomerCreditLedgerType.Hold, // HOLD type (fiat is already held, not spent yet)
		},
		orderBy: {
			createdAt: "desc", // Get the most recent HOLD entry for this order
		},
	});

	if (!holdEntry) {
		logger.warn("No HOLD fiat ledger entry found for order", {
			metadata: {
				storeId,
				customerId,
				orderId,
				rsvpId,
			},
			tags: ["rsvp", "fiat", "hold", "warning"],
		});
		// No HOLD entry found - might not be a prepaid RSVP with external payment, skip conversion
		return;
	}

	// Get absolute value of amount (it's negative for HOLD)
	const fiatAmount = Math.abs(Number(holdEntry.amount));

	// Get translation function
	const { t } = await getT();

	// Update existing HOLD ledger entry to SPEND (converting HOLD to SPEND)
	// amount and balance remain the same (already set during hold phase)
	await tx.customerFiatLedger.update({
		where: {
			id: holdEntry.id,
		},
		data: {
			type: CustomerCreditLedgerType.Spend, // SPEND type (converted from HOLD)
			referenceId: rsvpId, // Link to RSVP (not order)
		},
	});

	// Get last ledger balance
	const lastLedger = await tx.storeLedger.findFirst({
		where: { storeId },
		orderBy: { createdAt: "desc" },
		take: 1,
	});

	const balance = Number(lastLedger ? lastLedger.balance : 0);
	const newStoreBalance = balance + fiatAmount; // Increase store balance

	// Create StoreLedger entry for revenue recognition
	await tx.storeLedger.create({
		data: {
			storeId,
			orderId: orderId, // Use original order ID
			amount: new Prisma.Decimal(fiatAmount), // Positive for revenue
			fee: new Prisma.Decimal(0), // No payment processing fee for credit usage
			platformFee: new Prisma.Decimal(0), // No platform fee for credit usage
			currency: defaultCurrency.toLowerCase(),
			type: StoreLedgerType.StorePaymentProvider, // Revenue recognition (credit usage)
			balance: new Prisma.Decimal(newStoreBalance),
			description:
				t("rsvp_completion_revenue_note_fiat", {
					amount: fiatAmount,
					currency: defaultCurrency.toUpperCase(),
				}) ||
				`RSVP completion revenue: ${fiatAmount} ${defaultCurrency.toUpperCase()}`,
			note: "",
			createdBy: createdBy || null,
			availability: getUtcNowEpoch(), // Immediate availability for credit usage
			createdAt: getUtcNowEpoch(),
		},
	});

	logger.info("Converted HOLD to SPEND for completed RSVP", {
		metadata: {
			storeId,
			customerId,
			rsvpId,
			orderId,
			fiatAmount,
		},
		tags: ["rsvp", "fiat", "hold", "payment", "revenue"],
	});
}
