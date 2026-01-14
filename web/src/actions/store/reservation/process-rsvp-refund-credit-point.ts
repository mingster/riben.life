"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import {
	OrderStatus,
	PaymentStatus,
	StoreLedgerType,
	CustomerCreditLedgerType,
} from "@/types/enum";
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

	// Get the order to check payment method and get currency
	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			orderNum: true,
			orderStatus: true,
			paymentStatus: true,
			currency: true,
			PaymentMethod: {
				select: {
					id: true,
					payUrl: true,
					name: true,
				},
			},
		},
	});

	if (!order) {
		// Order not found - might have been deleted, skip refund
		return { refunded: false };
	}

	// Only refund if payment method is "creditPoint"
	if (order.PaymentMethod?.payUrl !== "creditPoint") {
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

	// Find the original ledger entry (HOLD for prepaid RSVPs, SPEND for legacy/non-prepaid)
	// HOLD design: Prepaid RSVPs use HOLD type (no revenue recognized yet)
	// Legacy/Non-prepaid: Use SPEND type (revenue was recognized, needs reversal)
	const holdEntry = await sqlClient.customerCreditLedger.findFirst({
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

	const isHoldRefund = !!holdEntry;

	// If no HOLD entry, try SPEND entry (legacy or non-prepaid RSVPs)
	const spendEntry = !holdEntry
		? await sqlClient.customerCreditLedger.findFirst({
				where: {
					storeId,
					userId: customerId,
					referenceId: orderId,
					type: CustomerCreditLedgerType.Spend,
				},
				orderBy: {
					createdAt: "desc", // Get the most recent SPEND entry for this order
				},
			})
		: null;

	if (!holdEntry && !spendEntry) {
		// No ledger entry found - might not have been paid with credit, skip refund
		return { refunded: false };
	}

	// Get absolute value of amount (it's negative for both HOLD and SPEND)
	const ledgerEntry = holdEntry || spendEntry;
	const refundCreditAmount = Math.abs(Number(ledgerEntry!.amount));

	// Use order's currency
	const orderCurrency = (order.currency || "twd").toLowerCase();

	// Get store to get credit exchange rate for StoreLedger
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			creditExchangeRate: true,
		},
	});

	if (!store) {
		const { t } = await getT();
		throw new SafeError(t("rsvp_store_not_found") || "Store not found");
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
				userId: customerId,
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.point) : 0;
		const newBalance = currentBalance + refundCreditAmount;

		// 2. Update or create customer credit balance
		await tx.customerCredit.upsert({
			where: {
				userId: customerId,
			},
			create: {
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
				type: CustomerCreditLedgerType.Refund,
				referenceId: orderId, // Link to original order
				note:
					refundReason ||
					t("rsvp_cancellation_refund_note_credit", {
						points: refundCreditAmount,
					}),
				creatorId: customerId, // Customer initiated cancellation
				createdAt: getUtcNowEpoch(),
			},
		});

		// 4. Create StoreLedger entry for revenue reversal (only for SPEND refunds, not HOLD)
		// HOLD design: No StoreLedger entry is created for HOLD refunds (no revenue was recognized)
		// Legacy/Non-prepaid: StoreLedger entry is created to reverse recognized revenue
		if (!isHoldRefund) {
			const lastLedger = await tx.storeLedger.findFirst({
				where: { storeId },
				orderBy: { createdAt: "desc" },
				take: 1,
			});

			const storeBalance = Number(lastLedger ? lastLedger.balance : 0);
			const newStoreBalance = storeBalance - refundCashAmount; // Decrease balance

			// Prepare ledger note - use RSVP format if RSVP data is available
			const paymentMethodName =
				order.PaymentMethod?.name || t("unknown_payment_method");
			let ledgerNote = t("store_ledger_note_order_refund", {
				paymentMethod: paymentMethodName,
				orderNum: order.orderNum || order.id,
			});

			// Fetch RSVP, store, and user data for RSVP format
			const rsvp = await tx.rsvp.findUnique({
				where: { id: rsvpId },
				select: { rsvpTime: true },
			});

			if (rsvp && rsvp.rsvpTime) {
				// Fetch store and user for the note
				const storeForNote = await tx.store.findUnique({
					where: { id: storeId },
					select: { defaultTimezone: true },
				});

				const user = await tx.user.findUnique({
					where: { id: customerId },
					select: { name: true },
				});

				if (storeForNote && user) {
					// Convert RSVP time (BigInt epoch) to Date
					const rsvpTimeDate = epochToDate(rsvp.rsvpTime);
					if (rsvpTimeDate) {
						// Format date in store timezone as "yyyy/MM/dd HH:mm"
						const formattedRsvpTime = format(
							getDateInTz(
								rsvpTimeDate,
								getOffsetHours(storeForNote.defaultTimezone || "Asia/Taipei"),
							),
							"yyyy/MM/dd HH:mm",
						);

						// Create RSVP format ledger note
						ledgerNote = t("store_ledger_note_rsvp_refund", {
							paymentMethod: paymentMethodName,
							rsvpTime: formattedRsvpTime,
							userName: user.name,
						});
					}
				}
			}

			await tx.storeLedger.create({
				data: {
					storeId,
					orderId: orderId,
					amount: new Prisma.Decimal(-refundCashAmount), // Negative: revenue reversal
					fee: new Prisma.Decimal(0), // No fee for credit refunds
					platformFee: new Prisma.Decimal(0), // No platform fee for credit refunds
					currency: orderCurrency,
					type: StoreLedgerType.StorePaymentProvider, // Revenue reversal (refund)
					balance: new Prisma.Decimal(newStoreBalance),
					description: t("rsvp_cancellation_refund_description", {
						points: refundCreditAmount,
					}),
					note: refundReason || ledgerNote,
					availability: getUtcNowEpoch(), // Immediate availability for refunds
					createdAt: getUtcNowEpoch(),
				},
			});
		}

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

		//add order note
		await tx.orderNote.create({
			data: {
				orderId: orderId,
				note: t("rsvp_cancellation_refund_note_credit", {
					points: refundCreditAmount,
				}),
				displayToCustomer: true,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});
	});

	return {
		refunded: true,
		refundAmount: refundCreditAmount,
	};
}
