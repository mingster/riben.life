"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { dateToEpoch, getUtcNowEpoch } from "@/utils/datetime-utils";
import {
	RsvpStatus,
	OrderStatus,
	PaymentStatus,
	StoreLedgerType,
} from "@/types/enum";
import { getT } from "@/app/i18n";

interface ProcessRsvpPrepaidPaymentParams {
	storeId: string;
	customerId: string | null;
	prepaidRequired: boolean;
	minPrepaidAmount: number | null;
	store: {
		useCustomerCredit: boolean | null;
		creditExchangeRate: number | null;
		defaultCurrency: string | null;
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
 */
export async function processRsvpPrepaidPayment(
	params: ProcessRsvpPrepaidPaymentParams,
): Promise<ProcessRsvpPrepaidPaymentResult> {
	const { storeId, customerId, prepaidRequired, minPrepaidAmount, store } =
		params;

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
		customerId &&
		store.useCustomerCredit &&
		minPrepaidAmount &&
		minPrepaidAmount > 0
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

		// minPrepaidAmount is in credit points (not dollars)
		// If it were in dollars, we'd need to convert using creditExchangeRate
		// For now, assuming minPrepaidAmount is already in credit points
		const requiredCredit = minPrepaidAmount;

		if (currentBalance >= requiredCredit) {
			// Customer has enough credit - deduct it and mark as paid
			const creditExchangeRate = Number(store.creditExchangeRate) || 1;
			const cashValue = requiredCredit * creditExchangeRate;

			// Get translation function for ledger note
			const { t } = await getT();

			// Deduct credit and create order in a transaction
			await sqlClient.$transaction(async (tx) => {
				// Create StoreOrder first (needed for referenceId in CustomerCreditLedger)
				// Use "reserve" shipping method for reservation orders
				const reserveShippingMethod = await tx.shippingMethod.findFirst({
					where: {
						identifier: "reserve",
						isDeleted: false,
					},
				});

				const defaultShippingMethod = reserveShippingMethod
					? reserveShippingMethod
					: await tx.shippingMethod.findFirst({
							where: { isDefault: true, isDeleted: false },
						});

				if (!defaultShippingMethod) {
					throw new SafeError("No shipping method available");
				}

				const creditPaymentMethod = await tx.paymentMethod.findFirst({
					where: {
						payUrl: "credit",
						isDeleted: false,
					},
				});

				if (!creditPaymentMethod) {
					throw new SafeError("Credit payment method not found");
				}

				const storeOrder = await tx.storeOrder.create({
					data: {
						storeId,
						userId: customerId,
						orderTotal: new Prisma.Decimal(cashValue),
						currency: store.defaultCurrency || "twd",
						paymentMethodId: creditPaymentMethod.id,
						shippingMethodId: defaultShippingMethod.id,
						orderStatus: Number(OrderStatus.Confirmed),
						paymentStatus: Number(PaymentStatus.Paid),
						isPaid: true,
						paidDate: getUtcNowEpoch(),
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
						OrderNotes: {
							create: {
								note: t("rsvp_prepaid_payment_note", {
									points: requiredCredit,
									cashValue,
									currency: (store.defaultCurrency || "twd").toUpperCase(),
								}),
								displayToCustomer: true,
								createdAt: getUtcNowEpoch(),
								updatedAt: getUtcNowEpoch(),
							},
						},
					},
				});

				orderId = storeOrder.id;

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
						referenceId: storeOrder.id, // Link to the order
						note: t("rsvp_prepaid_payment_credit_note", {
							points: requiredCredit,
						}),
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
						orderId: storeOrder.id,
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
