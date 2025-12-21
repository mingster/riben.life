"use server";

import { markOrderAsPaidSchema } from "./mark-order-as-paid.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import logger from "@/lib/logger";

/**
 * Mark order as paid (for cash/in-person payments or admin confirmation).
 * This action:
 * 1. Marks the order as paid
 * 2. Creates a StoreLedger entry with fees calculation
 * 3. Updates order status to Processing
 */
export const markOrderAsPaidAction = baseClient
	.metadata({ name: "markOrderAsPaid" })
	.schema(markOrderAsPaidSchema)
	.action(async ({ parsedInput }) => {
		const { orderId, checkoutAttributes } = parsedInput;

		// Get order with relations
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
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		if (!order.PaymentMethod) {
			throw new SafeError("Payment method not found");
		}

		if (order.isPaid) {
			// Order is already paid, return it as-is
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
		const isPro = (order.Store.level ?? 0) > 0;
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

		logger.info("Order marked as paid", {
			metadata: {
				orderId,
				storeId: order.storeId,
				usePlatform,
				fee: fee.toNumber(),
				platformFee: platformFee.toNumber(),
			},
			tags: ["order", "payment"],
		});

		return { order: updatedOrder };
	});
