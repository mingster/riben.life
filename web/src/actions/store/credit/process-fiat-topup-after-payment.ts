"use server";

import { processFiatTopUpAfterPaymentSchema } from "./process-fiat-topup-after-payment.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { processFiatTopUp } from "@/lib/credit-bonus";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";
import { ensureFiatRefillProduct } from "./ensure-fiat-refill-product";

/**
 * Process fiat top-up after payment is confirmed.
 * This should be called after payment is successful.
 * It will:
 * 1. Process fiat top-up (add to CustomerCredit.fiat)
 * 2. Mark the order as paid
 * 3. Create StoreLedger entry for unearned revenue (type = CreditRecharge)
 */
export const processFiatTopUpAfterPaymentAction = baseClient
	.metadata({ name: "processFiatTopUpAfterPayment" })
	.schema(processFiatTopUpAfterPaymentSchema)
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
						level: true,
					},
				},
				User: {
					select: {
						id: true,
					},
				},
				PaymentMethod: {
					select: {
						id: true,
						clearDays: true,
						fee: true, // gateway fee
						feeAdditional: true, // gateway fee additional
					},
				},
				OrderItemView: {
					select: {
						id: true,
						productId: true,
						name: true,
					},
				},
			},
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		if (!order.User) {
			throw new SafeError("Order must have a user ID");
		}

		// Verify this is a fiat refill order
		// Primary check: productId matches fiatRefillProduct.id (most reliable)
		// Fallback checks: checkoutAttributes and product name (for legacy orders or when productId unavailable)
		const isFiatRefillOrder = await (async () => {
			// Primary check: Check if any OrderItem has productId matching fiatRefillProduct.id
			// This is the most reliable method since productId is stable and doesn't change
			if (order.OrderItemView && order.OrderItemView.length > 0) {
				try {
					const fiatRefillProduct = await ensureFiatRefillProduct(
						order.storeId,
					);
					const hasFiatRefillProduct = order.OrderItemView.some(
						(item: { id: string; productId: string; name: string }) =>
							item.productId === fiatRefillProduct.id,
					);
					if (hasFiatRefillProduct) {
						return true;
					}
				} catch (error) {
					logger.warn(
						"Failed to get fiat refill product, falling back to other checks",
						{
							metadata: {
								orderId: order.id,
								storeId: order.storeId,
								error: error instanceof Error ? error.message : String(error),
							},
							tags: ["fiat", "refill", "error"],
						},
					);
				}
			}

			// Fallback 1: Check checkoutAttributes for fiatRefill flag
			// This is reliable when checkoutAttributes hasn't been modified by payment processors
			if (order.checkoutAttributes) {
				try {
					const parsed = JSON.parse(order.checkoutAttributes);
					// Check if parsed is an object and has fiatRefill property set to true
					if (
						typeof parsed === "object" &&
						parsed !== null &&
						parsed.fiatRefill === true
					) {
						return true;
					}
				} catch {
					// If parsing fails, fall back to product name check
				}
			}

			// Fallback 2: Check OrderItemView product name (least reliable, but works for legacy orders
			// or when checkoutAttributes has been modified by payment processors like Stripe)
			if (order.OrderItemView && order.OrderItemView.length > 0) {
				return order.OrderItemView.some(
					(item: { id: string; productId: string; name: string }) =>
						item.name === "Refill Account Balance" ||
						item.name === "Account Balance" ||
						item.name.toLowerCase().includes("account balance"),
				);
			}

			return false;
		})();

		if (!isFiatRefillOrder) {
			throw new SafeError("Order is not a fiat refill order");
		}

		// Check idempotency: Look for existing CustomerFiatLedger entry with referenceId = orderId, type = "TOPUP"
		const existingLedgerEntry = await sqlClient.customerFiatLedger.findFirst({
			where: {
				storeId: order.storeId,
				userId: order.User.id,
				referenceId: orderId,
				type: "TOPUP",
			},
		});

		if (existingLedgerEntry) {
			// Already processed - just mark order as paid if not already
			if (!order.isPaid) {
				await sqlClient.storeOrder.update({
					where: { id: orderId },
					data: {
						isPaid: true,
						paidDate: getUtcNowEpoch(),
						orderStatus: OrderStatus.Completed,
						paymentStatus: PaymentStatus.Paid,
						updatedAt: getUtcNowEpoch(),
					},
				});
			}

			logger.info("Fiat refill already processed for order", {
				metadata: {
					orderId,
					storeId: order.storeId,
					userId: order.User.id,
				},
				tags: ["fiat", "refill", "idempotency"],
			});

			return {
				success: true,
				message: "Fiat refill already processed",
			};
		}

		// Get fiat amount from order total
		const fiatAmount = Number(order.orderTotal);

		if (fiatAmount <= 0) {
			throw new SafeError("Invalid fiat amount");
		}

		// Get translation function
		const { t } = await getT();

		// Process fiat top-up
		const processFiatTopUpResult = await processFiatTopUp(
			order.storeId,
			order.User.id,
			fiatAmount,
			orderId, // Reference ID is the order ID
			order.User.id, // Creator ID is the creator of the order
			t("credit_refill_note_ledger", {
				orderNum: order.orderNum ?? orderId,
			}),
		);

		if (!processFiatTopUpResult.success) {
			throw new SafeError("Failed to process fiat top-up");
		}

		// Calculate fees from PaymentMethod
		const paymentMethod = order.PaymentMethod;
		let fee = 0;
		let feeTax = 0;
		let platformFee = 0;

		if (paymentMethod) {
			// Calculate gateway fee (based on payment method fee and feeAdditional)
			const feeAmount =
				fiatAmount * Number(paymentMethod.fee) +
				Number(paymentMethod.feeAdditional);
			fee = -feeAmount; // Negative because it's a cost
			feeTax = feeAmount * 0.05; // 5% tax on fee
		}

		// Calculate platform fee (only for Free-tier stores)
		const isPro = (order.Store.level ?? 0) > 0;
		if (!isPro) {
			platformFee = -fiatAmount * 0.01; // 1% platform fee for Free-tier stores
		}

		// Get last ledger balance
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: { storeId: order.storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);

		// Calculate availability date based on PaymentMethod.clearDays
		const clearDays = paymentMethod?.clearDays || 0;
		const availabilityDate = new Date();
		availabilityDate.setDate(availabilityDate.getDate() + clearDays);

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
					updatedAt: getUtcNowEpoch(),
				},
			});

			// Create StoreLedger entry for fiat refill (unearned revenue, type = CreditRecharge)
			await tx.storeLedger.create({
				data: {
					storeId: order.storeId,
					orderId: order.id,
					amount: new Prisma.Decimal(fiatAmount),
					fee: new Prisma.Decimal(fee + feeTax),
					platformFee: new Prisma.Decimal(platformFee),
					currency: order.Store.defaultCurrency,
					type: StoreLedgerType.CreditRecharge,
					balance: new Prisma.Decimal(
						balance + fiatAmount + (fee + feeTax) + platformFee,
					),
					description: t("fiat_refill_description_ledger", {
						fiatAmount,
						currency: order.Store.defaultCurrency.toUpperCase(),
					}),
					note: t("fiat_refill_note_ledger", {
						orderNum: order.orderNum ?? orderId,
					}),
					availability: BigInt(availabilityDate.getTime()),
					createdAt: getUtcNowEpoch(),
				},
			});
		});

		logger.info("Fiat refill processed successfully", {
			metadata: {
				orderId,
				storeId: order.storeId,
				userId: order.User.id,
				fiatAmount,
			},
			tags: ["fiat", "refill", "success"],
		});

		return {
			success: true,
			fiatAmount: processFiatTopUpResult.amount,
		};
	});
