"use server";

import { Prisma } from "@prisma/client";
import {
	CustomerCreditLedgerType,
	StoreLedgerType,
	OrderStatus,
	PaymentStatus,
} from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";
import type { PrismaClient } from "@prisma/client";

interface DeduceCustomerCreditParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	rsvpId: string;
	facilityId: string;
	duration: number; // Duration in minutes
	creditServiceExchangeRate: number; // Minutes per credit point
	creditExchangeRate: number; // Credit points to cash conversion rate (1 point = X dollars)
	defaultCurrency: string; // Store's default currency
	createdBy?: string | null;
}

interface DeduceCustomerCreditResult {
	success: boolean;
	creditDeducted: number;
	balanceBefore: number;
	balanceAfter: number;
	insufficientBalance: boolean;
}

interface CreateStoreOrderForRsvpParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	cashValue: number;
	defaultCurrency: string;
}

interface CreateStoreLedgerForRsvpParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	rsvpId: string;
	creditToDeduct: number;
	creditExchangeRate: number;
	defaultCurrency: string;
	duration: number;
	createdBy?: string | null;
}

/**
 * Creates a StoreOrder for RSVP credit usage if one doesn't exist.
 * Returns the orderId to use for StoreLedger entry.
 */
async function createStoreOrderForRsvp(
	params: CreateStoreOrderForRsvpParams,
): Promise<string> {
	const { tx, storeId, customerId, cashValue, defaultCurrency } = params;

	// Find takeout shipping method (required for StoreOrder)
	const takeoutShippingMethod = await tx.shippingMethod.findFirst({
		where: {
			identifier: "takeout",
			isDeleted: false,
		},
	});

	let shippingMethodId: string;
	if (takeoutShippingMethod) {
		shippingMethodId = takeoutShippingMethod.id;
	} else {
		// Fall back to default shipping method if takeout not found
		const defaultShippingMethod = await tx.shippingMethod.findFirst({
			where: { isDefault: true, isDeleted: false },
		});
		if (!defaultShippingMethod) {
			logger.error("No shipping method available for RSVP store order", {
				metadata: { storeId },
				tags: ["rsvp", "error"],
			});
			throw new Error("No shipping method available");
		}
		shippingMethodId = defaultShippingMethod.id;
	}

	// Find credit payment method (for credit usage, we use credit as the payment method)
	const creditPaymentMethod = await tx.paymentMethod.findFirst({
		where: {
			payUrl: "credit",
			isDeleted: false,
		},
	});

	if (!creditPaymentMethod) {
		logger.error("Credit payment method not found for RSVP store order", {
			metadata: { storeId },
			tags: ["rsvp", "error"],
		});
		throw new Error("Credit payment method not found");
	}

	// Create a minimal store order for StoreLedger reference
	const storeOrder = await tx.storeOrder.create({
		data: {
			storeId,
			userId: customerId,
			orderTotal: new Prisma.Decimal(cashValue),
			currency: defaultCurrency.toLowerCase(),
			paymentMethodId: creditPaymentMethod.id,
			shippingMethodId,
			orderStatus: OrderStatus.Confirmed,
			paymentStatus: PaymentStatus.Paid,
			isPaid: true,
			paidDate: getUtcNowEpoch(),
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
		},
	});

	return storeOrder.id;
}

/**
 * Creates StoreLedger entry for RSVP credit usage (revenue recognition).
 */
async function createStoreLedgerForRsvpCreditUsage(
	params: CreateStoreLedgerForRsvpParams,
): Promise<void> {
	const {
		tx,
		storeId,
		customerId,
		rsvpId,
		creditToDeduct,
		creditExchangeRate,
		defaultCurrency,
		duration,
		createdBy = null,
	} = params;

	// Get RSVP to check if it has an orderId
	const rsvp = await tx.rsvp.findUnique({
		where: { id: rsvpId },
		select: { orderId: true },
	});

	// Calculate cash value from credit points
	// cashValue = creditPoints * creditExchangeRate
	// Example: 2 credit points * 0.5 dollars/point = 1 dollar
	const cashValue = creditToDeduct * creditExchangeRate;

	// Get last ledger balance
	const lastLedger = await tx.storeLedger.findFirst({
		where: { storeId },
		orderBy: { createdAt: "desc" },
		take: 1,
	});

	const balance = Number(lastLedger ? lastLedger.balance : 0);
	const newStoreBalance = balance + cashValue;

	// StoreLedger requires orderId, but RSVP might not have one
	// If RSVP has orderId, use it; otherwise create a store order for reference
	let orderIdForLedger: string;
	if (rsvp?.orderId) {
		orderIdForLedger = rsvp.orderId;
	} else {
		orderIdForLedger = await createStoreOrderForRsvp({
			tx,
			storeId,
			customerId,
			cashValue,
			defaultCurrency,
		});

		// Update RSVP to link to the store order
		await tx.rsvp.update({
			where: { id: rsvpId },
			data: { orderId: orderIdForLedger },
		});
	}

	// Create StoreLedger entry for credit usage (revenue recognition)
	await tx.storeLedger.create({
		data: {
			storeId,
			orderId: orderIdForLedger,
			amount: new Prisma.Decimal(cashValue), // Positive for revenue
			fee: new Prisma.Decimal(0), // No payment processing fee for credit usage
			platformFee: new Prisma.Decimal(0), // No platform fee for credit usage
			currency: defaultCurrency.toLowerCase(),
			type: StoreLedgerType.CreditUsage, // Credit usage (revenue recognition)
			balance: new Prisma.Decimal(newStoreBalance),
			description: `RSVP Credit Usage - ${creditToDeduct} points`,
			note: `RSVP ID: ${rsvpId}. Credit points used: ${creditToDeduct}. Cash value: ${cashValue} ${defaultCurrency.toUpperCase()}. Duration: ${duration} minutes.`,
			createdBy: createdBy || null,
			availability: getUtcNowEpoch(), // Immediate availability for credit usage
			createdAt: getUtcNowEpoch(),
		},
	});

	logger.info("StoreLedger entry created for RSVP credit usage", {
		metadata: {
			rsvpId,
			storeId,
			creditAmount: creditToDeduct,
			cashValue,
			currency: defaultCurrency,
			orderId: orderIdForLedger,
			storeBalanceBefore: balance,
			storeBalanceAfter: newStoreBalance,
		},
		tags: ["rsvp", "credit", "store-ledger", "revenue"],
	});
}

/**
 * Deducts customer credit for a completed RSVP.
 * This function should be called within a transaction context.
 *
 * @param params - Parameters for credit deduction
 * @returns Result object with success status and balance information
 */
export async function deduceCustomerCredit(
	params: DeduceCustomerCreditParams,
): Promise<DeduceCustomerCreditResult> {
	const {
		tx,
		storeId,
		customerId,
		rsvpId,
		facilityId,
		duration,
		creditServiceExchangeRate,
		creditExchangeRate,
		defaultCurrency,
		createdBy = null,
	} = params;

	// Calculate credit to deduct based on duration and creditServiceExchangeRate
	// creditPoints = duration (minutes) / creditServiceExchangeRate (minutes per point)
	// Example: duration = 60 minutes, creditServiceExchangeRate = 30 minutes/point
	// creditToDeduct = 60 / 30 = 2 points
	const creditToDeduct = duration / creditServiceExchangeRate;

	// Update the RSVP's facilityCredit field to store the calculated credit amount
	await tx.rsvp.update({
		where: { id: rsvpId },
		data: {
			facilityCredit: new Prisma.Decimal(creditToDeduct),
		},
	});

	if (creditToDeduct <= 0) {
		return {
			success: false,
			creditDeducted: 0,
			balanceBefore: 0,
			balanceAfter: 0,
			insufficientBalance: false,
		};
	}

	// Get current credit balance
	const existingCredit = await tx.customerCredit.findUnique({
		where: {
			storeId_userId: {
				storeId,
				userId: customerId,
			},
		},
	});

	const currentBalance = existingCredit ? Number(existingCredit.point) : 0;

	if (currentBalance < creditToDeduct) {
		logger.warn("Insufficient credit balance for RSVP completion", {
			metadata: {
				rsvpId,
				customerId,
				requiredCredit: creditToDeduct,
				currentBalance,
			},
			tags: ["rsvp", "credit", "warning"],
		});

		return {
			success: false,
			creditDeducted: 0,
			balanceBefore: currentBalance,
			balanceAfter: currentBalance,
			insufficientBalance: true,
		};
	}

	const newBalance = currentBalance - creditToDeduct;

	// Update CustomerCredit
	await tx.customerCredit.upsert({
		where: {
			storeId_userId: {
				storeId,
				userId: customerId,
			},
		},
		update: {
			point: {
				decrement: creditToDeduct,
			},
			updatedAt: getUtcNowEpoch(),
		},
		create: {
			storeId,
			userId: customerId,
			point: -creditToDeduct, // Negative balance if deducting from zero
			updatedAt: getUtcNowEpoch(),
		},
	});

	// Get translation function for ledger note
	const { t } = await getT();

	// Create ledger entry for credit deduction
	await tx.customerCreditLedger.create({
		data: {
			storeId,
			userId: customerId,
			amount: new Prisma.Decimal(-creditToDeduct),
			balance: new Prisma.Decimal(newBalance),
			type: CustomerCreditLedgerType.Spend,
			referenceId: rsvpId, // Reference to RSVP
			note: t("rsvp_credit_deduction_note", {
				points: creditToDeduct,
			}),
			creatorId: createdBy || null,
			createdAt: getUtcNowEpoch(),
		},
	});

	logger.info("Customer credit deducted for completed RSVP", {
		metadata: {
			rsvpId,
			customerId,
			duration,
			creditServiceExchangeRate,
			creditAmount: creditToDeduct,
			balanceBefore: currentBalance,
			balanceAfter: newBalance,
		},
		tags: ["rsvp", "credit", "deduction"],
	});

	// Create StoreLedger entry for revenue recognition
	await createStoreLedgerForRsvpCreditUsage({
		tx,
		storeId,
		customerId,
		rsvpId,
		creditToDeduct,
		creditExchangeRate,
		defaultCurrency,
		duration,
		createdBy,
	});

	return {
		success: true,
		creditDeducted: creditToDeduct,
		balanceBefore: currentBalance,
		balanceAfter: newBalance,
		insufficientBalance: false,
	};
}
