"use server";

import { processCreditTopUpAfterPaymentSchema } from "./process-credit-topup-after-payment.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { processCreditTopUp } from "@/lib/credit-bonus";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { OrderStatus, PaymentStatus } from "@/types/enum";

/**
 * Process credit top-up after payment is confirmed.
 * This should be called after Stripe payment is successful.
 * It will:
 * 1. Process credit top-up (including bonus calculation)
 * 2. Mark the order as paid
 * 3. Create StoreLedger entry for unearned revenue (type = 2)
 */
export const processCreditTopUpAfterPaymentAction = baseClient
	.metadata({ name: "processCreditTopUpAfterPayment" })
	.schema(processCreditTopUpAfterPaymentSchema)
	.action(async ({ parsedInput }) => {
		const { orderId } = parsedInput;

		// Get order and verify it's a recharge order
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						id: true,
						defaultCurrency: true,
						level: true,
					},
				},
				User: {
					select: {
						id: true,
					},
				},
				PaymentMethod: true,
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		if (!order.userId) {
			throw new SafeError("Order must have a user ID");
		}

		// Check if credit was already processed (idempotency)
		const existingLedger = await sqlClient.customerCreditLedger.findFirst({
			where: {
				referenceId: orderId,
				type: "TOPUP",
			},
		});

		if (existingLedger) {
			// Credit already processed, just mark order as paid if not already
			if (!order.isPaid) {
				await sqlClient.storeOrder.update({
					where: { id: orderId },
					data: {
						isPaid: true,
						paidDate: getUtcNowEpoch(),
						orderStatus: OrderStatus.Processing,
						paymentStatus: PaymentStatus.Paid,
						updatedAt: getUtcNowEpoch(),
					},
				});
			}
			return {
				success: true,
				message: "Credit already processed",
				orderId,
			};
		}

		const rechargeAmount = Number(order.orderTotal);

		// Process credit top-up first (this creates CustomerCreditLedger entries)
		const result = await processCreditTopUp(
			order.storeId,
			order.userId,
			rechargeAmount,
			orderId, // referenceId
			null, // creatorId (null for customer-initiated)
			`Credit recharge: ${rechargeAmount} ${order.Store.defaultCurrency.toUpperCase()}`,
		);

		// Calculate fees
		let fee = 0;
		let feeTax = 0;
		let platformFee = 0;

		if (order.PaymentMethod) {
			fee = -Number(
				Number(rechargeAmount) * Number(order.PaymentMethod.fee) +
					Number(order.PaymentMethod.feeAdditional),
			);
			feeTax = Number(fee * 0.05);
		}

		// Check if store is pro level
		const isPro = (order.Store.level ?? 0) > 0;
		if (!isPro) {
			platformFee = -Number(Number(rechargeAmount) * 0.01);
		}

		// Get last ledger balance
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: { storeId: order.storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);

		// Calculate availability date
		const orderUpdatedDate = epochToDate(order.updatedAt);
		if (!orderUpdatedDate) {
			throw new SafeError("Order updatedAt is invalid");
		}

		const clearDays = order.PaymentMethod?.clearDays || 0;
		const availabilityDate = new Date(
			orderUpdatedDate.getTime() + clearDays * 24 * 60 * 60 * 1000,
		);

		// Mark order as paid and create StoreLedger entry in a transaction
		await sqlClient.$transaction(async (tx) => {
			// Mark order as paid
			await tx.storeOrder.update({
				where: { id: orderId },
				data: {
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					orderStatus: OrderStatus.Processing,
					paymentStatus: PaymentStatus.Paid,
					paymentCost: fee + feeTax + platformFee,
					checkoutAttributes: JSON.stringify({ creditRecharge: true }),
					updatedAt: getUtcNowEpoch(),
				},
			});

			// Create StoreLedger entry for credit recharge (unearned revenue, type = 2)
			await tx.storeLedger.create({
				data: {
					storeId: order.storeId,
					orderId: order.id,
					amount: new Prisma.Decimal(rechargeAmount),
					fee: new Prisma.Decimal(fee + feeTax),
					platformFee: new Prisma.Decimal(platformFee),
					currency: order.Store.defaultCurrency,
					type: 2, // Credit recharge type
					balance: new Prisma.Decimal(
						balance + Number(rechargeAmount) + (fee + feeTax) + platformFee,
					),
					description: `Credit Recharge - Order #${order.orderNum || order.id}`,
					note: `Customer credit top-up: ${rechargeAmount} ${order.Store.defaultCurrency.toUpperCase()}. Credit given: ${result.amount} + bonus ${result.bonus} = ${result.totalCredit} points.`,
					availability: BigInt(availabilityDate.getTime()),
					createdAt: getUtcNowEpoch(),
				},
			});
		});

		return {
			success: true,
			orderId,
			amount: result.amount,
			bonus: result.bonus,
			totalCredit: result.totalCredit,
		};
	});
