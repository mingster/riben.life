"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getT } from "@/app/i18n";

interface ProcessRsvpCreditPointsRefundParams {
	rsvpId: string;
	storeId: string;
	customerId: string | null;
	orderId: string | null;
	refundReason?: string;
}

interface ProcessRsvpCreditPointsRefundResult {
	refunded: boolean;
	refundAmount?: number; // Credit points refunded
}

/**
 * Process refund for RSVP reservation if it was paid with credit points.
 * Refunds credit back to customer and reverses revenue recognition.
 * @param params - Refund parameters including rsvpId, storeId, customerId, and orderId
 * @returns Result indicating if refund was processed and the refund amount
 */
export async function processRsvpCreditPointsRefund(
	params: ProcessRsvpCreditPointsRefundParams,
): Promise<ProcessRsvpCreditPointsRefundResult> {
	const { rsvpId, storeId, customerId, orderId, refundReason } = params;

	// If no orderId, no refund needed (reservation wasn't prepaid)
	if (!orderId || !customerId) {
		return { refunded: false };
	}

	// Get the order to check payment method
	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		include: {
			PaymentMethod: true,
		},
	});

	if (!order) {
		// Order not found - might have been deleted, skip refund
		return { refunded: false };
	}

	// Only refund if payment method is "credit"
	if (order.PaymentMethod?.payUrl !== "credit") {
		return { refunded: false };
	}

	// Check if order is already refunded
	if (
		order.orderStatus === Number(OrderStatus.Refunded) ||
		order.paymentStatus === Number(PaymentStatus.Refunded)
	) {
		// Already refunded, skip
		return { refunded: false };
	}

	// Find the original SPEND ledger entry to get the credit amount
	const spendEntry = await sqlClient.customerCreditLedger.findFirst({
		where: {
			storeId,
			userId: customerId,
			referenceId: orderId,
			type: "SPEND", // CustomerCreditLedgerType.Spend
		},
		orderBy: {
			createdAt: "desc", // Get the most recent SPEND entry for this order
		},
	});

	if (!spendEntry) {
		// No SPEND entry found - might not have been paid with credit, skip refund
		return { refunded: false };
	}

	// Get absolute value of amount (it's negative for SPEND)
	const refundCreditAmount = Math.abs(Number(spendEntry.amount));

	// Get store to get credit exchange rate for StoreLedger
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			creditExchangeRate: true,
			defaultCurrency: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	const creditExchangeRate = Number(store.creditExchangeRate) || 1;
	const refundCashAmount = refundCreditAmount * creditExchangeRate;

	// Get translation function
	const { t } = await getT();

	// Process refund in transaction
	await sqlClient.$transaction(async (tx) => {
		// 1. Get current customer credit balance (or 0 if record doesn't exist)
		const customerCredit = await tx.customerCredit.findUnique({
			where: {
				storeId_userId: {
					storeId,
					userId: customerId,
				},
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.point) : 0;
		const newBalance = currentBalance + refundCreditAmount;

		// 2. Update or create customer credit balance
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
				fiat: new Prisma.Decimal(0), // Ensure fiat is set
				updatedAt: getUtcNowEpoch(),
			},
			update: {
				point: new Prisma.Decimal(newBalance),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// 3. Create CustomerCreditLedger entry for refund
		await tx.customerCreditLedger.create({
			data: {
				storeId,
				userId: customerId,
				amount: new Prisma.Decimal(refundCreditAmount), // Positive for refund
				balance: new Prisma.Decimal(newBalance),
				type: "REFUND", // CustomerCreditLedgerType.Refund
				referenceId: orderId, // Link to original order
				note:
					refundReason ||
					t("rsvp_cancellation_refund_note", {
						points: refundCreditAmount,
					}),
				creatorId: customerId, // Customer initiated cancellation
				createdAt: getUtcNowEpoch(),
			},
		});

		// 4. Create StoreLedger entry for revenue reversal
		const lastLedger = await tx.storeLedger.findFirst({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const storeBalance = Number(lastLedger ? lastLedger.balance : 0);
		const newStoreBalance = storeBalance - refundCashAmount; // Decrease balance

		await tx.storeLedger.create({
			data: {
				storeId,
				orderId: orderId,
				amount: new Prisma.Decimal(-refundCashAmount), // Negative: revenue reversal
				fee: new Prisma.Decimal(0), // No fee for credit refunds
				platformFee: new Prisma.Decimal(0), // No platform fee for credit refunds
				currency: (store.defaultCurrency || "twd").toLowerCase(),
				type: StoreLedgerType.CreditUsage, // Same type as credit usage (revenue-related)
				balance: new Prisma.Decimal(newStoreBalance),
				description: t("rsvp_cancellation_refund_description", {
					points: refundCreditAmount,
				}),
				note:
					refundReason ||
					t("rsvp_cancellation_refund_note", {
						amount: refundCashAmount,
						currency: (store.defaultCurrency || "twd").toUpperCase(),
					}),
				availability: getUtcNowEpoch(), // Immediate availability for refunds
				createdAt: getUtcNowEpoch(),
			},
		});

		// 5. Update order status to Refunded
		await tx.storeOrder.update({
			where: { id: orderId },
			data: {
				refundAmount: new Prisma.Decimal(refundCashAmount),
				orderStatus: Number(OrderStatus.Refunded),
				paymentStatus: Number(PaymentStatus.Refunded),
				updatedAt: getUtcNowEpoch(),
			},
		});
	});

	return {
		refunded: true,
		refundAmount: refundCreditAmount,
	};
}
