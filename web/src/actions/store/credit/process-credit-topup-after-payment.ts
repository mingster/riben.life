"use server";

import { getT } from "@/app/i18n";
import { processCreditTopUp } from "@/lib/credit-bonus";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { baseClient } from "@/utils/actions/safe-action";
import { epochToDate, getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { processCreditTopUpAfterPaymentSchema } from "./process-credit-topup-after-payment.validation";

/**
 * Process credit top-up after payment is confirmed.
 * This should be called after Stripe payment is successful.
 * It will:
 * 1. Process credit top-up (including bonus calculation)
 * 2. Mark the order as paid
 * 3. Create StoreLedger entry for unearned revenue (type = CreditRecharge)
 */
export const processCreditTopUpAfterPaymentAction = baseClient
	.metadata({ name: "processCreditTopUpAfterPayment" })
	.schema(processCreditTopUpAfterPaymentSchema)
	.action(async ({ parsedInput }) => {
		const { orderId } = parsedInput;

		// Get order and verify it's a refill order
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						id: true,
						defaultCurrency: true,
						defaultTimezone: true,
						level: true,
						creditExchangeRate: true, // Need exchange rate to calculate credit amount
						useCustomerCredit: true,
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

			logger.info("Credit already processed", {
				metadata: {
					orderId,
					message: "Credit already processed",
				},
				tags: ["info", "credit", "topup"],
			});

			return {
				success: true,
				message: "Credit already processed",
				orderId,
			};
		}

		const dollarAmount = Number(order.orderTotal);

		// Calculate credit amount from dollar amount using exchange rate
		const creditExchangeRate = Number(order.Store.creditExchangeRate);
		if (creditExchangeRate <= 0) {
			logger.error("Credit exchange rate is not configured", {
				metadata: {
					orderId,
					error: "Credit exchange rate is not configured",
				},
				tags: ["error", "credit", "topup"],
			});

			return {
				success: false,
				orderId,
				serverError: "Credit exchange rate is not configured",
				message: "Credit exchange rate is not configured",
			};
		}

		const creditAmount = dollarAmount / creditExchangeRate;

		// Get translation function for ledger note
		const { t } = await getT();

		// Process credit top-up first (this creates CustomerCreditLedger entries)
		// Note: processCreditTopUp expects credit amount (points), not dollar amount
		const processCreditTopUpResult = await processCreditTopUp(
			order.storeId,
			order.userId,
			creditAmount,
			orderId, // referenceId
			null, // creatorId (null for customer-initiated)
			t("refill_customer_ledger_note", {
				creditAmount,
				dollarAmount,
				currency: order.Store.defaultCurrency.toUpperCase(),
			}),
		);

		// If credit top-up failed, return early without further processing
		if (!processCreditTopUpResult.success) {
			logger.error("Credit top-up processing failed", {
				metadata: {
					orderId,
					error: "Credit top-up processing failed",
				},
				tags: ["error", "credit", "topup"],
			});
			return {
				success: false,
				orderId,
				serverError: "Credit top-up processing failed",
				message: "Credit top-up processing failed",
			};
		}

		// Calculate fees (based on dollar amount, not credit amount)
		let fee = 0;
		let feeTax = 0;
		let platformFee = 0;

		if (order.PaymentMethod) {
			fee = -Number(
				Number(dollarAmount) * Number(order.PaymentMethod.fee) +
					Number(order.PaymentMethod.feeAdditional),
			);
			feeTax = Number(fee * 0.05);
		}

		// Check if store is pro level
		const isPro = (order.Store.level ?? 0) > 0;
		if (!isPro) {
			platformFee = -Number(Number(dollarAmount) * 0.01);
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

		// Parse checkoutAttributes to check for rsvpId
		let rsvpId: string | undefined;
		let checkoutAttributes: Record<string, any> = { creditRecharge: true };
		try {
			if (order.checkoutAttributes) {
				const parsed = JSON.parse(order.checkoutAttributes);
				checkoutAttributes = { ...parsed, creditRecharge: true };
				rsvpId = parsed.rsvpId;
			}
		} catch {
			// If parsing fails, use default
		}

		// Mark order as paid and completed. Also create StoreLedger entry in a transaction
		await sqlClient.$transaction(async (tx) => {
			// Mark order as paid and completed
			await tx.storeOrder.update({
				where: { id: orderId },
				data: {
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					orderStatus: OrderStatus.Completed,
					paymentStatus: PaymentStatus.Paid,
					paymentCost: fee + feeTax + platformFee,
					checkoutAttributes: JSON.stringify(checkoutAttributes),
					updatedAt: getUtcNowEpoch(),
				},
			});

			// Create StoreLedger entry for credit refill (unearned revenue, type = CreditRecharge)
			await tx.storeLedger.create({
				data: {
					storeId: order.storeId,
					orderId: order.id,
					amount: new Prisma.Decimal(dollarAmount),
					fee: new Prisma.Decimal(fee + feeTax),
					platformFee: new Prisma.Decimal(platformFee),
					currency: order.Store.defaultCurrency,
					type: StoreLedgerType.CreditRecharge,
					balance: new Prisma.Decimal(
						balance + dollarAmount + (fee + feeTax) + platformFee,
					),
					description: t("credit_refill_description_ledger", {
						creditAmount,
						dollarAmount,
						currency: order.Store.defaultCurrency.toUpperCase(),
						amount: processCreditTopUpResult.amount,
						bonus: processCreditTopUpResult.bonus,
						totalCredit: processCreditTopUpResult.totalCredit,
					}),
					note: t("credit_refill_note_ledger", {
						orderNum: order.orderNum ?? order.id,
					}),
					availability: BigInt(availabilityDate.getTime()),
					createdAt: getUtcNowEpoch(),
				},
			});

			// add order note - credit_refill_completed
			await tx.orderNote.create({
				data: {
					orderId: order.id,
					note: t("credit_refill_completed", {
						balance: balance,
					}),
					displayToCustomer: true,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
		});
	});
