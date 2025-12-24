"use server";

import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { RsvpStatus, StoreLedgerType } from "@/types/enum";
import { getT } from "@/app/i18n";
import { format } from "date-fns";
import { createRsvpStoreOrder } from "./create-rsvp-store-order";

interface ProcessRsvpPrepaidPaymentParams {
	storeId: string;
	customerId: string | null;
	minPrepaidPercentage: number;
	totalCost: number | null;
	rsvpTime: BigInt | number | Date; // RSVP reservation time
	store: {
		useCustomerCredit: boolean | null;
		creditExchangeRate: number | null;
		defaultCurrency: string | null;
		defaultTimezone?: string | null; // Store timezone for date formatting
	};
}

interface ProcessRsvpPrepaidPaymentResult {
	status: number;
	alreadyPaid: boolean;
	orderId: string | null;
}

/**
 * Process prepaid payment for RSVP using customer credit.
 * If customer has sufficient credit, deducts it and creates order/ledger entries.
 * Returns the status, alreadyPaid flag, and orderId.
 *
 * SHOULD NOT call this action if store.useCustomerCredit = false
 */
export async function processRsvpPrepaidPaymentUsingCredit(
	params: ProcessRsvpPrepaidPaymentParams,
): Promise<ProcessRsvpPrepaidPaymentResult> {
	const {
		storeId,
		customerId,
		minPrepaidPercentage,
		totalCost,
		rsvpTime,
		store,
	} = params;

	const prepaidRequired =
		minPrepaidPercentage > 0 && totalCost !== null && totalCost > 0;
	const requiredPrepaid = prepaidRequired
		? Math.ceil(totalCost * (minPrepaidPercentage / 100))
		: null;

	// Determine initial status and payment status:
	// - If prepaid is NOT required: status = ReadyToConfirm (immediately ready for confirmation)
	// - If prepaid IS required: check if customer has enough credit
	//   - If yes: deduct credit, set status = ReadyToConfirm, alreadyPaid = true
	//   - If no: status = Pending (will be updated to ReadyToConfirm after payment)
	let initialStatus = prepaidRequired
		? Number(RsvpStatus.Pending)
		: Number(RsvpStatus.ReadyToConfirm);
	let alreadyPaid = false;
	let orderId: string | null = null;

	// If prepaid is required and customer is signed in, check credit balance
	if (
		prepaidRequired &&
		requiredPrepaid !== null &&
		requiredPrepaid > 0 &&
		customerId &&
		store.useCustomerCredit
	) {
		// Get customer credit balance
		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: {
				storeId_userId: {
					storeId,
					userId: customerId,
				},
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.point) : 0;

		// Convert currency to credit points if exchange rate is provided; otherwise assume 1:1
		const creditExchangeRate = Number(store.creditExchangeRate) || 1;
		const requiredCredit =
			creditExchangeRate > 0
				? requiredPrepaid / creditExchangeRate
				: requiredPrepaid;

		if (currentBalance >= requiredCredit) {
			// Customer has enough credit - deduct it and mark as paid
			const cashValue = requiredCredit * creditExchangeRate;

			// Get translation function for ledger note
			const { t } = await getT();

			// Format RSVP date/time for the note
			let rsvpTimeEpoch: bigint;
			if (typeof rsvpTime === "number") {
				rsvpTimeEpoch = BigInt(rsvpTime);
			} else if (rsvpTime instanceof Date) {
				rsvpTimeEpoch = BigInt(rsvpTime.getTime());
			} else if (typeof rsvpTime === "bigint") {
				rsvpTimeEpoch = rsvpTime;
			} else {
				// Handle Prisma BigInt type
				rsvpTimeEpoch =
					typeof rsvpTime === "object" && "toString" in rsvpTime
						? BigInt(rsvpTime.toString())
						: BigInt(Number(rsvpTime));
			}
			const rsvpTimeDate = epochToDate(rsvpTimeEpoch);
			const storeTimezone = store.defaultTimezone || "Asia/Taipei";
			const datetimeFormat = t("datetime_format");
			let formattedRsvpTime = "";
			if (rsvpTimeDate) {
				const storeDate = getDateInTz(
					rsvpTimeDate,
					getOffsetHours(storeTimezone),
				);
				formattedRsvpTime = format(storeDate, `${datetimeFormat} HH:mm`);
			}

			// Deduct credit and create order in a transaction
			await sqlClient.$transaction(async (tx) => {
				// Create StoreOrder first (needed for referenceId in CustomerCreditLedger)
				const orderNote = t("rsvp_prepaid_payment_note", {
					points: requiredCredit,
					cashValue,
					currency: (store.defaultCurrency || "twd").toUpperCase(),
				});

				orderId = await createRsvpStoreOrder({
					tx,
					storeId,
					customerId,
					orderTotal: cashValue,
					currency: store.defaultCurrency || "twd",
					paymentMethodPayUrl: "credit", // Credit payment for prepaid
					note: orderNote,
					isPaid: true, // Already paid via credit deduction
				});

				// Deduct credit from customer balance
				const newBalance = currentBalance - requiredCredit;
				await tx.customerCredit.upsert({
					where: {
						storeId_userId: {
							storeId,
							userId: customerId,
						},
					},
					create: {
						storeId,
						userId: customerId,
						point: new Prisma.Decimal(newBalance),
						updatedAt: getUtcNowEpoch(),
					},
					update: {
						point: new Prisma.Decimal(newBalance),
						updatedAt: getUtcNowEpoch(),
					},
				});

				// Create CustomerCreditLedger entry with orderId reference
				await tx.customerCreditLedger.create({
					data: {
						storeId,
						userId: customerId,
						amount: new Prisma.Decimal(-requiredCredit), // Negative for deduction
						balance: new Prisma.Decimal(newBalance),
						type: "SPEND",
						referenceId: orderId, // Link to the order
						note: t("rsvp_prepaid_payment_credit_note", {
							points: requiredCredit,
							rsvpTime: formattedRsvpTime,
						}),
						creatorId: customerId, // Customer initiated this prepaid payment
						createdAt: getUtcNowEpoch(),
					},
				});

				// Create StoreLedger entry for credit usage (revenue recognition)
				const lastLedger = await tx.storeLedger.findFirst({
					where: { storeId },
					orderBy: { createdAt: "desc" },
					take: 1,
				});

				const balance = Number(lastLedger ? lastLedger.balance : 0);
				const newStoreBalance = balance + cashValue;

				await tx.storeLedger.create({
					data: {
						storeId,
						orderId: orderId,
						amount: new Prisma.Decimal(cashValue), // Positive for revenue
						fee: new Prisma.Decimal(0), // No payment processing fee for credit usage
						platformFee: new Prisma.Decimal(0), // No platform fee for credit usage
						currency: (store.defaultCurrency || "twd").toLowerCase(),
						type: StoreLedgerType.CreditUsage, // Credit usage (revenue recognition)
						balance: new Prisma.Decimal(newStoreBalance),
						description: t("rsvp_prepaid_payment_note", {
							points: requiredCredit,
							cashValue,
							currency: (store.defaultCurrency || "twd").toUpperCase(),
						}),
						note: "",
						availability: getUtcNowEpoch(), // Immediate availability for credit usage
						createdAt: getUtcNowEpoch(),
					},
				});
			});

			// Update status and payment flag
			initialStatus = Number(RsvpStatus.ReadyToConfirm);
			alreadyPaid = true;
		}
	}

	return {
		status: initialStatus,
		alreadyPaid,
		orderId,
	};
}
