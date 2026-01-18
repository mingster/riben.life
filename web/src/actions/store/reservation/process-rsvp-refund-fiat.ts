"use server";

import { sqlClient } from "@/lib/prismadb";
import { Prisma, PrismaClient } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import {
	CustomerCreditLedgerType,
	OrderStatus,
	PaymentStatus,
} from "@/types/enum";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";

type TransactionClient = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface ProcessRsvpFiatRefundParams {
	rsvpId: string;
	storeId: string;
	customerId: string | null;
	orderId: string | null;
	refundReason?: string;
	tx?: TransactionClient; // Optional transaction client for atomicity
}

interface ProcessRsvpFiatRefundResult {
	refunded: boolean;
	refundAmount?: number; // Fiat amount refunded
}

/**
 * Process refund for RSVP reservation back to customer's fiat balance for any payment method other than credit points.
 *
 * @param params - Refund parameters including rsvpId, storeId, customerId, orderId, and optional transaction client
 * @returns Result indicating if refund was processed and the refund amount
 *
 * If `tx` is provided, the refund will be processed within that transaction context for atomicity.
 * If `tx` is not provided, a new transaction will be created (legacy behavior).
 */
export async function processRsvpFiatRefund(
	params: ProcessRsvpFiatRefundParams,
): Promise<ProcessRsvpFiatRefundResult> {
	const { rsvpId, storeId, customerId, orderId, refundReason, tx } = params;

	// If no customerId or orderId, no refund needed
	if (!customerId || !orderId) {
		return { refunded: false };
	}

	// Use transaction client if provided, otherwise use sqlClient for initial queries
	const client = tx || sqlClient;

	// Get the order to check if it's paid and get currency
	const order = await client.storeOrder.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			orderNum: true,
			isPaid: true,
			orderTotal: true,
			currency: true,
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
	// Use order's currency
	const orderCurrency = (order.currency || "twd").toLowerCase();

	logger.info("Processing fiat refund for paid order", {
		metadata: {
			rsvpId,
			storeId,
			customerId,
			orderId,
			orderTotal: refundFiatAmount,
			currency: orderCurrency,
			paymentMethod: order.PaymentMethod?.name,
			paymentMethodPayUrl: order.PaymentMethod?.payUrl,
		},
		tags: ["refund", "fiat"],
	});

	// Get translation function
	const { t } = await getT();

	// Process refund - use provided transaction client or create a new transaction
	const processRefund = async (transactionClient: TransactionClient) => {
		// 1. Get current customer fiat balance (or 0 if record doesn't exist)
		const customerCredit = await transactionClient.customerCredit.findUnique({
			where: {
				userId: customerId,
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.fiat) : 0;
		const newBalance = currentBalance + refundFiatAmount;

		// 2. Update or create customer fiat balance
		await transactionClient.customerCredit.upsert({
			where: {
				userId: customerId,
			},
			create: {
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
		await transactionClient.customerFiatLedger.create({
			data: {
				storeId,
				userId: customerId,
				amount: new Prisma.Decimal(refundFiatAmount), // Positive for refund
				balance: new Prisma.Decimal(newBalance),
				type: CustomerCreditLedgerType.Refund,
				referenceId: orderId || rsvpId, // Link to original order or RSVP
				note:
					refundReason ||
					t("rsvp_cancellation_refund_note", {
						amount: refundFiatAmount,
						currency: orderCurrency.toUpperCase(),
					}),
				creatorId: customerId, // Customer initiated cancellation
				createdAt: getUtcNowEpoch(),
			},
		});

		// remove HOLD entry if exists
		await transactionClient.customerFiatLedger.deleteMany({
			where: {
				storeId,
				userId: customerId,
				referenceId: orderId,
				type: CustomerCreditLedgerType.Hold,
			},
		});

		// 4. Update order status to Refunded
		// Check if order is already refunded
		const orderToUpdate = await transactionClient.storeOrder.findUnique({
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
			await transactionClient.storeOrder.update({
				where: { id: orderId },
				data: {
					refundAmount: new Prisma.Decimal(refundFiatAmount),
					orderStatus: Number(OrderStatus.Refunded),
					paymentStatus: Number(PaymentStatus.Refunded),
					updatedAt: getUtcNowEpoch(),
				},
			});

			//add order note
			await transactionClient.orderNote.create({
				data: {
					orderId: orderId,
					note: t("rsvp_cancellation_refund_note", {
						amount: refundFiatAmount,
						currency: orderCurrency.toUpperCase(),
					}),
					displayToCustomer: true,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
		}
	};

	// If transaction client is provided, use it directly; otherwise create a new transaction
	if (tx) {
		await processRefund(tx);
	} else {
		await sqlClient.$transaction(async (transactionClient) => {
			await processRefund(transactionClient);
		});
	}

	return {
		refunded: true,
		refundAmount: refundFiatAmount,
	};
}
