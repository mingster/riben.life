"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import logger from "@/lib/logger";
import type { StoreOrder } from "@/types";
import { getT } from "@/app/i18n";

interface MarkOrderAsPaidCoreParams {
	order: StoreOrder & {
		Store: {
			id: string;
			level: number | null;
			LINE_PAY_ID: string | null;
			STRIPE_SECRET_KEY: string | null;
		};
		PaymentMethod?: {
			id: string;
			fee: number | Prisma.Decimal;
			feeAdditional: number | Prisma.Decimal;
			clearDays: number | null;
			name: string | null;
		} | null;
		OrderItemView?: Array<{
			id: string;
			productId: string;
			name: string;
		}>;
	};
	paymentMethodId: string; // Payment method ID to use for this payment
	isPro: boolean;
	checkoutAttributes?: string;
	logTags?: string[];
}

/**
 * Core logic for marking an order as paid.
 * This function ONLY handles:
 * 1. Idempotency checks
 * 2. Fee calculations
 * 3. StoreLedger entry creation (for regular orders only)
 * 4. Order status updates
 *
 * NOTE: This function does NOT handle:
 * - Credit point top-ups (use processCreditTopUpAfterPaymentAction)
 * - Fiat top-ups (use processFiatTopUpAfterPaymentAction)
 * - RSVP updates (use processRsvpAfterPaymentAction)
 *
 * @param params - Parameters including order, isPro status, checkoutAttributes, and optional log tags
 * @returns Updated order with all relations
 */
export async function markOrderAsPaidCore(
	params: MarkOrderAsPaidCoreParams,
): Promise<StoreOrder> {
	const {
		order,
		paymentMethodId,
		isPro,
		checkoutAttributes,
		logTags = [],
	} = params;

	// Fetch payment method by the provided paymentMethodId
	// Always use the provided paymentMethodId (e.g., when changing from TBD to cash)
	// Only fall back to order's PaymentMethod if paymentMethodId is not provided
	let paymentMethod = await sqlClient.paymentMethod.findUnique({
		where: { id: paymentMethodId },
	});

	if (!paymentMethod) {
		throw new SafeError("Payment method not found");
	}

	// Ensure the payment method ID matches (should always match since we fetched by ID)
	if (paymentMethod.id !== paymentMethodId) {
		throw new SafeError("Payment method ID mismatch");
	}

	logger.info("Marking order as paid", {
		metadata: {
			orderId: order.id,
			storeId: order.storeId,
			checkoutAttributes: order.checkoutAttributes,
		},
		tags: ["order", "payment", ...logTags],
	});

	// Idempotency check: Order already paid
	if (order.isPaid) {
		const existingOrder = await sqlClient.storeOrder.findUnique({
			where: { id: order.id },
			include: {
				Store: true,
				OrderNotes: true,
				OrderItemView: true,
				User: true,
				ShippingMethod: true,
				PaymentMethod: true,
			},
		});

		if (!existingOrder) {
			throw new SafeError("Failed to retrieve order");
		}

		transformPrismaDataForJson(existingOrder);
		return existingOrder;
	}

	// Idempotency check: Check for existing ledger entry to prevent duplicate charges
	const existingLedger = await sqlClient.storeLedger.findFirst({
		where: { orderId: order.id },
	});

	if (existingLedger) {
		logger.warn(
			"Duplicate payment attempt detected - ledger entry already exists",
			{
				metadata: {
					orderId: order.id,
					ledgerId: existingLedger.id,
					storeId: order.storeId,
				},
				tags: ["order", "payment", "idempotency", ...logTags],
			},
		);

		const existingOrder = await sqlClient.storeOrder.findUnique({
			where: { id: order.id },
			include: {
				Store: true,
				OrderNotes: true,
				OrderItemView: true,
				User: true,
				ShippingMethod: true,
				PaymentMethod: true,
			},
		});

		if (!existingOrder) {
			throw new SafeError("Failed to retrieve order");
		}

		transformPrismaDataForJson(existingOrder);
		return existingOrder;
	}

	// Determine if platform payment processing is used
	let usePlatform = false; // 是否代收款 (platform payment processing)

	if (!isPro) {
		usePlatform = true; // Free level stores always use platform
	} else {
		// Pro stores use platform if they have LINE Pay or Stripe configured
		if (
			order.Store.LINE_PAY_ID !== null ||
			order.Store.STRIPE_SECRET_KEY !== null
		) {
			usePlatform = true;
		}
	}

	// Get last ledger balance
	const lastLedger = await sqlClient.storeLedger.findFirst({
		where: { storeId: order.storeId },
		orderBy: { createdAt: "desc" },
		take: 1,
	});

	const balance = Number(lastLedger ? lastLedger.balance : 0);

	// Calculate fees (only for platform payments)
	let fee = new Prisma.Decimal(0);
	let feeTax = new Prisma.Decimal(0);

	if (usePlatform) {
		// Fee rate is determined by payment method
		const feeAmount =
			Number(order.orderTotal) * Number(paymentMethod.fee) +
			Number(paymentMethod.feeAdditional);
		fee = new Prisma.Decimal(-feeAmount);
		feeTax = new Prisma.Decimal(feeAmount * 0.05);
	}

	// Platform fee (only for Free stores)
	let platformFee = new Prisma.Decimal(0);
	if (!isPro) {
		platformFee = new Prisma.Decimal(-Number(order.orderTotal) * 0.01);
	}

	// Calculate availability date (order date + payment method clear days)
	const orderUpdatedDate = epochToDate(order.updatedAt);
	if (!orderUpdatedDate) {
		throw new SafeError("Order updatedAt is invalid");
	}

	const clearDays = paymentMethod.clearDays || 0;
	const availabilityDate = new Date(
		orderUpdatedDate.getTime() + clearDays * 24 * 60 * 60 * 1000,
	);

	// Get translation function outside transaction to avoid timeout
	const { t } = await getT();

	// Check if this order is for an RSVP reservation
	// RSVP orders should have status Completed, but RSVP processing is handled separately
	const rsvp = await sqlClient.rsvp.findFirst({
		where: { orderId: order.id },
	});

	// For RSVP orders, set status to Completed when payment is successful
	// For regular orders, set status to Processing
	const newOrderStatus = rsvp ? OrderStatus.Completed : OrderStatus.Processing;

	// Mark order as paid and create StoreLedger entry in transaction
	// Increase timeout to 10 seconds to handle complex operations
	await sqlClient.$transaction(
		async (tx) => {
			// Mark order as paid and update payment method
			await tx.storeOrder.update({
				where: { id: order.id },
				data: {
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					orderStatus: newOrderStatus,
					paymentStatus: PaymentStatus.Paid,
					paymentMethodId: paymentMethodId, // Update to the actual payment method used
					paymentCost:
						fee.toNumber() + feeTax.toNumber() + platformFee.toNumber(),
					checkoutAttributes:
						checkoutAttributes || order.checkoutAttributes || "",
					updatedAt: getUtcNowEpoch(),
				},
			});

			// Create order note: "payment" + "PaymentStatus_Completed"
			const now = getUtcNowEpoch();
			await tx.orderNote.create({
				data: {
					orderId: order.id,
					note: `${t("payment")} ${t("payment_status_completed")}`,
					displayToCustomer: true,
					createdAt: now,
					updatedAt: now,
				},
			});

			// Prepare ledger note
			let ledgerNote = `${paymentMethod.name || "Unknown"}, ${t("order")}:${order.orderNum || order.id}`;

			// For RSVP orders, skip StoreLedger creation (HOLD design - revenue recognized on completion)
			// RSVP processing (status updates, customer ledger entries) is handled by processRsvpAfterPaymentAction
			// For regular orders, create StoreLedger entry
			if (!rsvp) {
				const ledgerType = usePlatform
					? StoreLedgerType.HoldByPlatform // 0: 代收 (platform payment processing)
					: StoreLedgerType.StorePaymentProvider; // 1: Store's own payment provider

				await tx.storeLedger.create({
					data: {
						orderId: order.id,
						storeId: order.storeId,
						amount: order.orderTotal,
						fee,
						platformFee,
						currency: order.currency,
						type: ledgerType,
						description: `order # ${order.orderNum || order.id}`,
						note: ledgerNote,
						availability: BigInt(availabilityDate.getTime()),
						balance: new Prisma.Decimal(
							balance +
								Number(order.orderTotal) +
								fee.toNumber() +
								feeTax.toNumber() +
								platformFee.toNumber(),
						),
						createdAt: getUtcNowEpoch(),
					},
				});
			}
		},
		{
			maxWait: 10000, // Maximum time to wait to acquire a transaction (10 seconds)
			timeout: 10000, // Maximum time the transaction can run (10 seconds)
		},
	);

	// Fetch updated order with all relations
	const updatedOrder = await sqlClient.storeOrder.findUnique({
		where: { id: order.id },
		include: {
			Store: true,
			OrderNotes: true,
			OrderItemView: true,
			User: true,
			ShippingMethod: true,
			PaymentMethod: true,
		},
	});

	if (!updatedOrder) {
		throw new SafeError("Failed to retrieve updated order");
	}

	transformPrismaDataForJson(updatedOrder);

	logger.info("Order marked as paid", {
		metadata: {
			orderId: order.id,
			storeId: order.storeId,
			usePlatform,
			fee: fee.toNumber(),
			platformFee: platformFee.toNumber(),
			orderTotal: order.orderTotal,
			orderNum: order.orderNum,
		},
		tags: ["order", "payment", ...logTags],
	});

	return updatedOrder;
}
