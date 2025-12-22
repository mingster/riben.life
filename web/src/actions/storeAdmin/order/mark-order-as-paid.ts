"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import logger from "@/lib/logger";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";

/**
 * Mark order as paid (store admin).
 * This action allows store admins to manually mark orders as paid (e.g., for cash/in-person payments).
 * This action:
 * 1. Validates the order belongs to the store
 * 2. Marks the order as paid
 * 3. Creates a StoreLedger entry with fees calculation
 * 4. Updates order status to Processing
 */
export const markOrderAsPaidAction = storeActionClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { orderId, checkoutAttributes } = parsedInput;

		// Get order with relations (including OrderItemView to check for Store Credit)
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						id: true,
						level: true,
						LINE_PAY_ID: true,
						STRIPE_SECRET_KEY: true,
					},
				},
				PaymentMethod: true,
				OrderItemView: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		// Validate order belongs to the store
		if (order.storeId !== storeId) {
			throw new SafeError("Order does not belong to this store");
		}

		if (!order.PaymentMethod) {
			throw new SafeError("Payment method not found");
		}

		// Check if this is a Store Credit (credit recharge) order
		// Store Credit orders should use processCreditTopUpAfterPaymentAction instead
		const isStoreCreditOrder = order.OrderItemView.some(
			(item) => item.name === "Store Credit",
		);

		if (isStoreCreditOrder) {
			// For Store Credit orders, use the credit top-up processing action
			// This will handle both marking as paid AND processing credit top-up
			logger.info("Processing Store Credit order via credit top-up action", {
				metadata: {
					orderId,
					storeId,
				},
				tags: ["order", "payment", "credit", "store-admin"],
			});

			const creditResult = await processCreditTopUpAfterPaymentAction({
				orderId,
			});

			if (creditResult?.serverError) {
				logger.error("Failed to process credit top-up for Store Credit order", {
					metadata: {
						orderId,
						storeId,
						error: creditResult.serverError,
					},
					tags: ["order", "payment", "credit", "error", "store-admin"],
				});
				throw new SafeError(
					creditResult.serverError || "Failed to process credit top-up",
				);
			}

			// Fetch updated order with all relations
			const updatedOrder = await sqlClient.storeOrder.findUnique({
				where: { id: orderId },
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
					orderId,
					storeId,
					creditAmount: creditResult.data?.amount,
					bonus: creditResult.data?.bonus,
					totalCredit: creditResult.data?.totalCredit,
				},
				tags: ["order", "payment", "credit", "store-admin"],
			});

			return { order: updatedOrder };
		}

		if (order.isPaid) {
			// Order is already paid, return it as-is (idempotent)
			const existingOrder = await sqlClient.storeOrder.findUnique({
				where: { id: orderId },
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
			return { order: existingOrder };
		}

		// Idempotency check: Check for existing ledger entry to prevent duplicate charges
		const existingLedger = await sqlClient.storeLedger.findFirst({
			where: { orderId: order.id },
		});

		if (existingLedger) {
			// Ledger entry already exists, return existing order (idempotent)
			logger.warn(
				"Duplicate payment attempt detected - ledger entry already exists",
				{
					metadata: {
						orderId,
						ledgerId: existingLedger.id,
						storeId,
					},
					tags: ["order", "payment", "idempotency", "store-admin"],
				},
			);

			const existingOrder = await sqlClient.storeOrder.findUnique({
				where: { id: orderId },
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
			return { order: existingOrder };
		}

		// Determine if platform payment processing is used
		const isPro = await isProLevel(storeId);
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
				Number(order.orderTotal) * Number(order.PaymentMethod.fee) +
				Number(order.PaymentMethod.feeAdditional);
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

		const clearDays = order.PaymentMethod.clearDays || 0;
		const availabilityDate = new Date(
			orderUpdatedDate.getTime() + clearDays * 24 * 60 * 60 * 1000,
		);

		// Mark order as paid and create ledger entry in transaction
		await sqlClient.$transaction(async (tx) => {
			// Mark order as paid
			await tx.storeOrder.update({
				where: { id: orderId },
				data: {
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					orderStatus: OrderStatus.Processing,
					paymentStatus: PaymentStatus.Paid,
					paymentCost:
						fee.toNumber() + feeTax.toNumber() + platformFee.toNumber(),
					checkoutAttributes:
						checkoutAttributes || order.checkoutAttributes || "",
					updatedAt: getUtcNowEpoch(),
				},
			});

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
					note: `${order.PaymentMethod?.name || "Unknown"}, order id: ${order.id}`,
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
			where: { id: orderId },
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

		logger.info("Order marked as paid by store admin", {
			metadata: {
				orderId,
				storeId,
				usePlatform,
				fee: fee.toNumber(),
				platformFee: platformFee.toNumber(),
			},
			tags: ["order", "payment", "store-admin"],
		});

		return { order: updatedOrder };
	});
