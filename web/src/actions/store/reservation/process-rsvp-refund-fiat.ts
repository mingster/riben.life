"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";

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
 * Process refund for RSVP reservation back to customer's fiat balance for any payment method other than credit points.
 *
 * @param params - Refund parameters including rsvpId, storeId, customerId, and orderId
 * @returns Result indicating if refund was processed and the refund amount
 */
export async function processRsvpFiatRefund(
	params: ProcessRsvpFiatRefundParams,
): Promise<ProcessRsvpFiatRefundResult> {
	const { rsvpId, storeId, customerId, orderId, refundReason } = params;

	// If no customerId or orderId, no refund needed
	if (!customerId || !orderId) {
		return { refunded: false };
	}

	// Get the order to check if it's paid
	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			isPaid: true,
			orderTotal: true,
			PaymentMethod: {
				select: {
					payUrl: true,
					name: true,
				},
			},
		},
	});

	if (!order) {
		logger.warn("Order not found for fiat refund", {
			metadata: { rsvpId, storeId, customerId, orderId },
			tags: ["refund", "fiat"],
		});
		return { refunded: false };
	}

	// Only process refund if order is paid
	if (!order.isPaid) {
		logger.info("Order is not paid, skipping fiat refund", {
			metadata: { rsvpId, storeId, customerId, orderId },
			tags: ["refund", "fiat"],
		});
		return { refunded: false };
	}

	// Use order total as refund amount (for any payment method other than credit points)
	const refundFiatAmount = Number(order.orderTotal);

	logger.info("Processing fiat refund for paid order", {
		metadata: {
			rsvpId,
			storeId,
			customerId,
			orderId,
			orderTotal: refundFiatAmount,
			paymentMethod: order.PaymentMethod?.name,
			paymentMethodPayUrl: order.PaymentMethod?.payUrl,
		},
		tags: ["refund", "fiat"],
	});

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

		// 4. Update order status to Refunded and create StoreLedger entry for revenue reversal
		// Check if order is already refunded
		const orderToUpdate = await tx.storeOrder.findUnique({
			where: { id: orderId },
			select: {
				orderStatus: true,
				paymentStatus: true,
			},
		});

		if (
			orderToUpdate &&
			orderToUpdate.orderStatus !== Number(OrderStatus.Refunded) &&
			orderToUpdate.paymentStatus !== Number(PaymentStatus.Refunded)
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
	});

	return {
		refunded: true,
		refundAmount: refundFiatAmount,
	};
}
