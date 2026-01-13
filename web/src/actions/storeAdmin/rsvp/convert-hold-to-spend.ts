"use server";

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { CustomerCreditLedgerType, StoreLedgerType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";

interface ConvertHoldToSpendParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	rsvpId: string;
	orderId: string;
	creditExchangeRate: number;
	defaultCurrency: string;
	createdBy?: string | null;
}

/**
 * Converts HOLD ledger entry to SPEND and creates StoreLedger entry for revenue recognition.
 * This function should be called when a prepaid RSVP (paid with credit using HOLD) is completed.
 * Customer credit balance remains the same (already reduced during hold phase).
 */
export async function convertHoldToSpend(
	params: ConvertHoldToSpendParams,
): Promise<void> {
	const {
		tx,
		storeId,
		customerId,
		rsvpId,
		orderId,
		creditExchangeRate,
		defaultCurrency,
		createdBy = null,
	} = params;

	// Find the original HOLD ledger entry for this order
	const holdEntry = await tx.customerCreditLedger.findFirst({
		where: {
			storeId,
			userId: customerId,
			referenceId: orderId,
			type: CustomerCreditLedgerType.Hold,
		},
		orderBy: {
			createdAt: "desc", // Get the most recent HOLD entry for this order
		},
	});

	if (!holdEntry) {
		logger.warn("No HOLD ledger entry found for order", {
			metadata: {
				storeId,
				customerId,
				orderId,
				rsvpId,
			},
			tags: ["rsvp", "credit", "hold", "warning"],
		});
		// No HOLD entry found - might not be a prepaid RSVP, skip conversion
		return;
	}

	// Get absolute value of amount (it's negative for HOLD)
	const creditAmount = Math.abs(Number(holdEntry.amount));

	// Get current customer credit balance (should already be reduced from HOLD)
	const customerCredit = await tx.customerCredit.findUnique({
		where: {
			userId: customerId,
		},
	});

	const currentBalance = customerCredit ? Number(customerCredit.point) : 0;

	// Get translation function
	const { t } = await getT();

	// Create new SPEND ledger entry (customer balance remains the same)
	await tx.customerCreditLedger.create({
		data: {
			storeId,
			userId: customerId,
			amount: new Prisma.Decimal(-creditAmount), // Negative for spend
			balance: new Prisma.Decimal(currentBalance), // Same balance (already reduced during hold)
			type: CustomerCreditLedgerType.Spend,
			referenceId: rsvpId, // Link to RSVP (not order)
			note: t("rsvp_credit_deduction_note", {
				points: creditAmount,
			}),
			creatorId: createdBy || null,
			createdAt: getUtcNowEpoch(),
		},
	});

	// Calculate cash value from credit points
	const cashValue = creditAmount * creditExchangeRate;

	// Get last ledger balance
	const lastLedger = await tx.storeLedger.findFirst({
		where: { storeId },
		orderBy: { createdAt: "desc" },
		take: 1,
	});

	const balance = Number(lastLedger ? lastLedger.balance : 0);
	const newStoreBalance = balance + cashValue;

	// Create StoreLedger entry for revenue recognition
	await tx.storeLedger.create({
		data: {
			storeId,
			orderId: orderId, // Use original order ID
			amount: new Prisma.Decimal(cashValue), // Positive for revenue
			fee: new Prisma.Decimal(0), // No payment processing fee for credit usage
			platformFee: new Prisma.Decimal(0), // No platform fee for credit usage
			currency: defaultCurrency.toLowerCase(),
			type: StoreLedgerType.Revenue, // Credit usage (revenue recognition)
			balance: new Prisma.Decimal(newStoreBalance),
			description: t("rsvp_prepaid_payment_note", {
				points: creditAmount,
				cashValue,
				currency: defaultCurrency.toUpperCase(),
			}),
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
			creditAmount,
			cashValue,
		},
		tags: ["rsvp", "credit", "hold", "spend", "revenue"],
	});
}
