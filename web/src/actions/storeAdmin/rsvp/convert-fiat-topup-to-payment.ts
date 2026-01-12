"use server";

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { StoreLedgerType } from "@/types/enum";
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
 * Converts TOPUP fiat ledger entry to PAYMENT and creates StoreLedger entry for revenue recognition.
 * This function should be called when a prepaid RSVP (paid with external payment using TOPUP) is completed.
 * Deducts fiat from customer's balance and creates StoreLedger entry for revenue recognition.
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

	// Find the original TOPUP ledger entry for this order
	const topupEntry = await tx.customerFiatLedger.findFirst({
		where: {
			storeId,
			userId: customerId,
			referenceId: orderId,
			type: "TOPUP", // TOPUP type (HOLD design for RSVP external payments)
		},
		orderBy: {
			createdAt: "desc", // Get the most recent TOPUP entry for this order
		},
	});

	if (!topupEntry) {
		logger.warn("No TOPUP fiat ledger entry found for order", {
			metadata: {
				storeId,
				customerId,
				orderId,
				rsvpId,
			},
			tags: ["rsvp", "fiat", "topup", "warning"],
		});
		// No TOPUP entry found - might not be a prepaid RSVP with external payment, skip conversion
		return;
	}

	// Get amount (it's positive for TOPUP)
	const fiatAmount = Number(topupEntry.amount);

	// Get current customer fiat balance (should already be credited from TOPUP)
	const customerCredit = await tx.customerCredit.findUnique({
		where: {
			storeId_userId: {
				storeId,
				userId: customerId,
			},
		},
	});

	const currentBalance = customerCredit ? Number(customerCredit.fiat) : 0;
	const newBalance = currentBalance - fiatAmount;

	// Get translation function
	const { t } = await getT();

	// Update CustomerCredit (fiat field) - deduct the amount
	await tx.customerCredit.update({
		where: {
			storeId_userId: {
				storeId,
				userId: customerId,
			},
		},
		data: {
			fiat: {
				decrement: fiatAmount,
			},
			updatedAt: getUtcNowEpoch(),
		},
	});

	// Create new PAYMENT ledger entry (converting HOLD to PAYMENT)
	await tx.customerFiatLedger.create({
		data: {
			storeId,
			userId: customerId,
			amount: new Prisma.Decimal(-fiatAmount), // Negative for payment
			balance: new Prisma.Decimal(newBalance), // Updated balance after payment
			type: "PAYMENT", // PAYMENT type (converted from TOPUP)
			referenceId: rsvpId, // Link to RSVP (not order)
			note:
				t("rsvp_completion_fiat_payment_note", {
					amount: fiatAmount,
					currency: defaultCurrency.toUpperCase(),
				}) || `RSVP completion: ${fiatAmount} ${defaultCurrency.toUpperCase()}`,
			creatorId: createdBy || null,
			createdAt: getUtcNowEpoch(),
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
			type: StoreLedgerType.CreditUsage, // Credit usage (revenue recognition)
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

	logger.info("Converted TOPUP to PAYMENT for completed RSVP", {
		metadata: {
			storeId,
			customerId,
			rsvpId,
			orderId,
			fiatAmount,
		},
		tags: ["rsvp", "fiat", "topup", "payment", "revenue"],
	});
}
