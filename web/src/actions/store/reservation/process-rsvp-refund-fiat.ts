"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getT } from "@/app/i18n";

interface ProcessRsvpFiatRefundParams {
	rsvpId: string;
	storeId: string;
	customerId: string | null;
	orderId: string | null;
	refundReason?: string;
}

interface ProcessRsvpFiatRefundResult {
	refunded: boolean;
	refundAmount?: number; // Fiat amount refunded
}

/**
 * Process refund for RSVP reservation if it was paid with fiat balance.
 * Refunds fiat back to customer and reverses revenue recognition.
 * @param params - Refund parameters including rsvpId, storeId, customerId, and orderId
 * @returns Result indicating if refund was processed and the refund amount
 */
export async function processRsvpFiatRefund(
	params: ProcessRsvpFiatRefundParams,
): Promise<ProcessRsvpFiatRefundResult> {
	const { rsvpId, storeId, customerId, orderId, refundReason } = params;

	// If no customerId, no refund needed (reservation wasn't prepaid with fiat)
	if (!customerId) {
		return { refunded: false };
	}

	// Find the original PAYMENT ledger entry to get the fiat amount
	// Try to find by rsvpId first (fiat payments may not have orderId)
	// If not found, try by orderId
	const paymentEntry = await sqlClient.customerFiatLedger.findFirst({
		where: {
			storeId,
			userId: customerId,
			type: "PAYMENT", // CustomerFiatLedgerType.Payment
			OR: [
				...(rsvpId ? [{ referenceId: rsvpId }] : []),
				...(orderId ? [{ referenceId: orderId }] : []),
			],
		},
		orderBy: {
			createdAt: "desc", // Get the most recent PAYMENT entry
		},
	});

	if (!paymentEntry) {
		// No PAYMENT entry found - might not have been paid with fiat, skip refund
		return { refunded: false };
	}

	// Get absolute value of amount (it's negative for PAYMENT)
	const refundFiatAmount = Math.abs(Number(paymentEntry.amount));

	// Get store to get default currency
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			defaultCurrency: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// Get translation function
	const { t } = await getT();

	// Process refund in transaction
	await sqlClient.$transaction(async (tx) => {
		// 1. Get current customer fiat balance (or 0 if record doesn't exist)
		const customerCredit = await tx.customerCredit.findUnique({
			where: {
				storeId_userId: {
					storeId,
					userId: customerId,
				},
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.fiat) : 0;
		const newBalance = currentBalance + refundFiatAmount;

		// 2. Update or create customer fiat balance
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
				fiat: new Prisma.Decimal(newBalance),
				point: new Prisma.Decimal(0), // Ensure point is set
				updatedAt: getUtcNowEpoch(),
			},
			update: {
				fiat: new Prisma.Decimal(newBalance),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// 3. Create CustomerFiatLedger entry for refund
		await tx.customerFiatLedger.create({
			data: {
				storeId,
				userId: customerId,
				amount: new Prisma.Decimal(refundFiatAmount), // Positive for refund
				balance: new Prisma.Decimal(newBalance),
				type: "REFUND", // CustomerFiatLedgerType.Refund
				referenceId: orderId || rsvpId, // Link to original order or RSVP
				note:
					refundReason ||
					t("rsvp_cancellation_refund_note", {
						amount: refundFiatAmount,
						currency: (store.defaultCurrency || "twd").toUpperCase(),
					}),
				creatorId: customerId, // Customer initiated cancellation
				createdAt: getUtcNowEpoch(),
			},
		});

		// 4. If orderId exists, update order status and create StoreLedger entry for revenue reversal
		if (orderId) {
			// Get the order to check payment method and status
			const order = await tx.storeOrder.findUnique({
				where: { id: orderId },
				include: {
					PaymentMethod: true,
				},
			});

			if (order) {
				// Check if order is already refunded
				if (
					order.orderStatus !== Number(OrderStatus.Refunded) &&
					order.paymentStatus !== Number(PaymentStatus.Refunded)
				) {
					// Update order status to Refunded
					await tx.storeOrder.update({
						where: { id: orderId },
						data: {
							refundAmount: new Prisma.Decimal(refundFiatAmount),
							orderStatus: Number(OrderStatus.Refunded),
							paymentStatus: Number(PaymentStatus.Refunded),
							updatedAt: getUtcNowEpoch(),
						},
					});

					// Create StoreLedger entry for revenue reversal
					const lastLedger = await tx.storeLedger.findFirst({
						where: { storeId },
						orderBy: { createdAt: "desc" },
						take: 1,
					});

					const storeBalance = Number(lastLedger ? lastLedger.balance : 0);
					const newStoreBalance = storeBalance - refundFiatAmount; // Decrease balance

					await tx.storeLedger.create({
						data: {
							storeId,
							orderId: orderId,
							amount: new Prisma.Decimal(-refundFiatAmount), // Negative: revenue reversal
							fee: new Prisma.Decimal(0), // No fee for fiat refunds
							platformFee: new Prisma.Decimal(0), // No platform fee for fiat refunds
							currency: (store.defaultCurrency || "twd").toLowerCase(),
							type: StoreLedgerType.StorePaymentProvider, // Revenue-related type
							balance: new Prisma.Decimal(newStoreBalance),
							description: t("rsvp_cancellation_refund_description", {
								amount: refundFiatAmount,
								currency: (store.defaultCurrency || "twd").toUpperCase(),
							}),
							note:
								refundReason ||
								t("rsvp_cancellation_refund_note", {
									amount: refundFiatAmount,
									currency: (store.defaultCurrency || "twd").toUpperCase(),
								}),
							availability: getUtcNowEpoch(), // Immediate availability for refunds
							createdAt: getUtcNowEpoch(),
						},
					});
				}
			}
		}
	});

	return {
		refunded: true,
		refundAmount: refundFiatAmount,
	};
}
