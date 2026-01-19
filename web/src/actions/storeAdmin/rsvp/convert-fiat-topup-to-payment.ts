"use server";

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { StoreLedgerType, CustomerCreditLedgerType } from "@/types/enum";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
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

	// Fetch RSVP with customer and store information for note
	const rsvp = await tx.rsvp.findUnique({
		where: { id: rsvpId },
		select: {
			rsvpTime: true,
			name: true, // For anonymous reservations
			Customer: {
				select: {
					name: true,
				},
			},
			Store: {
				select: {
					defaultTimezone: true,
				},
			},
		},
	});

	// Get translation function
	const { t } = await getT();

	// Format customer name and RSVP time for note
	let customerName = "";
	let formattedRsvpTime = "";

	if (rsvp) {
		// Get customer name (from Customer.name or RSVP.name for anonymous)
		customerName = rsvp.Customer?.name || rsvp.name || "";

		// Format RSVP time
		if (rsvp.rsvpTime) {
			const storeTimezone = rsvp.Store?.defaultTimezone || "Asia/Taipei";
			const rsvpTimeEpoch =
				typeof rsvp.rsvpTime === "number"
					? BigInt(rsvp.rsvpTime)
					: typeof rsvp.rsvpTime === "bigint"
						? rsvp.rsvpTime
						: BigInt(rsvp.rsvpTime);

			const utcDate = epochToDate(rsvpTimeEpoch);
			if (utcDate) {
				const storeDate = getDateInTz(utcDate, getOffsetHours(storeTimezone));
				const datetimeFormat = t("datetime_format") || "yyyy-MM-dd";
				formattedRsvpTime = format(storeDate, `${datetimeFormat} HH:mm`);
			}
		}
	}

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
			note: (() => {
				// Use appropriate translation key based on available information
				if (customerName && formattedRsvpTime) {
					return (
						t("rsvp_completion_revenue_note_fiat_with_details", {
							amount: fiatAmount,
							currency: defaultCurrency.toUpperCase(),
							customerName,
							rsvpTime: formattedRsvpTime,
						}) ||
						`RSVP completion revenue: ${fiatAmount} ${defaultCurrency.toUpperCase()} (Customer: ${customerName}, RSVP Time: ${formattedRsvpTime})`
					);
				} else if (customerName) {
					return (
						t("rsvp_completion_revenue_note_fiat_with_customer", {
							customerName,
						}) ||
						`RSVP completion revenue: ${fiatAmount} ${defaultCurrency.toUpperCase()} (Customer: ${customerName})`
					);
				} else if (formattedRsvpTime) {
					return (
						t("rsvp_completion_revenue_note_fiat_with_time", {
							rsvpTime: formattedRsvpTime,
						}) ||
						`RSVP completion revenue: ${fiatAmount} ${defaultCurrency.toUpperCase()} (RSVP Time: ${formattedRsvpTime})`
					);
				}
				return (
					t("rsvp_completion_revenue_note_fiat", {
						amount: fiatAmount,
						currency: defaultCurrency.toUpperCase(),
					}) ||
					`RSVP completion revenue: ${fiatAmount} ${defaultCurrency.toUpperCase()}`
				);
			})(),
			description:
				t("rsvp_completion_fiat_payment_descr") || "RSVP completion revenue",
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
