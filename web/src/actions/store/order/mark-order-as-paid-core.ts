"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import {
	OrderStatus,
	PaymentStatus,
	StoreLedgerType,
	RsvpStatus,
} from "@/types/enum";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import logger from "@/lib/logger";
import type { StoreOrder } from "@/types";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
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
 * This function handles:
 * 1. Idempotency checks
 * 2. Fee calculations
 * 3. Ledger entry creation
 * 4. Order status updates
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

	// Check if this is a Store Credit (credit recharge) order
	// Store Credit orders should use processCreditTopUpAfterPaymentAction instead
	if (order.OrderItemView && order.OrderItemView.length > 0) {
		const isStoreCreditOrder = order.OrderItemView.some(
			(item: { id: string; name: string }) => item.name === "Store Credit",
		);

		if (isStoreCreditOrder) {
			// For Store Credit orders, use the credit top-up processing action
			// This will handle both marking as paid AND processing credit top-up
			logger.info("Processing Store Credit order via credit top-up action", {
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
				},
				tags: ["order", "payment", "credit", ...logTags],
			});

			const creditResult = await processCreditTopUpAfterPaymentAction({
				orderId: order.id,
			});

			if (creditResult?.serverError) {
				logger.error("Failed to process credit top-up for Store Credit order", {
					metadata: {
						orderId: order.id,
						storeId: order.storeId,
						error: creditResult.serverError,
					},
					tags: ["order", "payment", "credit", "error", ...logTags],
				});
				throw new SafeError(
					creditResult.serverError || "Failed to process credit top-up",
				);
			}

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

			logger.info("Store Credit order processed successfully", {
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
					creditAmount: creditResult.data?.amount,
					bonus: creditResult.data?.bonus,
					totalCredit: creditResult.data?.totalCredit,
				},
				tags: ["order", "payment", "credit", ...logTags],
			});

			return updatedOrder;
		}
	}

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

	// Mark order as paid and create ledger entry in transaction
	await sqlClient.$transaction(async (tx) => {
		// Check if this order is for an RSVP reservation
		const rsvp = await tx.rsvp.findFirst({
			where: { orderId: order.id },
		});

		// For RSVP orders, set status to Completed when payment is successful
		// For regular orders, set status to Processing
		const newOrderStatus = rsvp
			? OrderStatus.Completed
			: OrderStatus.Processing;

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

		if (rsvp) {
			const now = getUtcNowEpoch();

			// Check if noNeedToConfirm is enabled in RSVP settings
			// If enabled, auto-confirm the reservation since the order is being marked as paid
			const rsvpSettings = await tx.rsvpSettings.findFirst({
				where: { storeId: rsvp.storeId },
				select: { noNeedToConfirm: true },
			});

			// If noNeedToConfirm is enabled, auto-confirm the reservation (order is being marked as paid)
			const shouldAutoConfirm = rsvpSettings?.noNeedToConfirm === true;

			// Determine new status based on current status and noNeedToConfirm setting
			// If noNeedToConfirm is enabled and status is Pending, set to Ready (auto-confirmed)
			// If noNeedToConfirm is disabled and status is Pending, set to ReadyToConfirm (needs confirmation)
			// Otherwise, keep the current status
			let newStatus = rsvp.status;
			if (rsvp.status === RsvpStatus.Pending) {
				newStatus = shouldAutoConfirm
					? RsvpStatus.Ready
					: RsvpStatus.ReadyToConfirm;
			}

			// Update RSVP status and mark as already paid
			await tx.rsvp.update({
				where: { id: rsvp.id },
				data: {
					alreadyPaid: true,
					paidAt: now,
					status: newStatus,
					confirmedByStore: shouldAutoConfirm ? true : rsvp.confirmedByStore,
					updatedAt: now,
				},
			});

			// TODO: 1. send notification to customer to confirm the reservation
			// TODO: 2. send notification to store staff to confirm the reservation

			logger.info("RSVP updated after order payment", {
				metadata: {
					rsvpId: rsvp.id,
					orderId: order.id,
					previousStatus: rsvp.status,
					newStatus: newStatus,
					noNeedToConfirm: rsvpSettings?.noNeedToConfirm ?? false,
					autoConfirmed: shouldAutoConfirm,
				},
				tags: ["rsvp", "payment", "order", ...logTags],
			});
		}
		// Get translation function for ledger note
		const { t } = await getT();

		// Prepare ledger note - use RSVP format if it's an RSVP order
		let ledgerNote = `${paymentMethod.name || "Unknown"}, ${t("order")}:${order.orderNum || order.id}`;

		if (rsvp && rsvp.rsvpTime) {
			// Format: `${paymentMethod.name || "Unknown"}, ${t("rsvp")}:format(${rsvp.rsvpTime},'yyyy/MM/dd HH:mm') for ${user.name}`
			// Fetch store and user for the note
			const store = await tx.store.findUnique({
				where: { id: order.storeId },
				select: { defaultTimezone: true },
			});

			const user = await tx.user.findUnique({
				where: { id: order.userId },
				select: { name: true },
			});

			if (store && user) {
				// Convert RSVP time (BigInt epoch) to Date
				const rsvpTimeDate = epochToDate(rsvp.rsvpTime);
				if (rsvpTimeDate) {
					// Format date in store timezone as "yyyy/MM/dd HH:mm"
					const formattedRsvpTime = format(
						getDateInTz(
							rsvpTimeDate,
							getOffsetHours(store.defaultTimezone || "Asia/Taipei"),
						),
						"yyyy/MM/dd HH:mm",
					);

					// Create RSVP format ledger note
					ledgerNote = `${paymentMethod.name || "Unknown"}, ${t("rsvp")}:${formattedRsvpTime} for ${user.name}`;
				}
			}
		}

		// Create StoreLedger entry
		const ledgerType = usePlatform
			? StoreLedgerType.PlatformPayment // 0: 代收 (platform payment processing)
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
	});

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
