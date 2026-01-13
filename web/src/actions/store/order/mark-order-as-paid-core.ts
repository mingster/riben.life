"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import {
	OrderStatus,
	PaymentStatus,
	StoreLedgerType,
	RsvpStatus,
	CustomerCreditLedgerType,
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
import { processFiatTopUpAfterPaymentAction } from "@/actions/store/credit/process-fiat-topup-after-payment";
import { ensureFiatRefillProduct } from "@/actions/store/credit/ensure-fiat-refill-product";
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

	// Debug logging
	logger.info("the order", {
		metadata: {
			orderId: order.id,
			storeId: order.storeId,
			checkoutAttributes: order.checkoutAttributes,
			orderItemView: order.OrderItemView.map(
				(item: { id: string; productId: string; name: string }) => ({
					id: item.id,
					productId: item.productId,
					name: item.name,
				}),
			),
		},
		tags: ["order", "payment", "fiat", "debug", ...logTags],
	});

	//#region account balance refill order

	// Handle account fiat refill order from /s/refill-account-balance
	// Check if this is an Account Balance (fiat refill) order
	// Account Balance orders should use processFiatTopUpAfterPaymentAction instead
	// Primary check: productId matches fiatRefillProduct.id (most reliable)
	// Fallback checks: checkoutAttributes and product name (for legacy orders or when productId unavailable)
	const isAccountBalanceOrder = await (async () => {
		// Primary check: Check if any OrderItem has productId matching fiatRefillProduct.id
		// This is the most reliable method since productId is stable and doesn't change
		if (order.OrderItemView && order.OrderItemView.length > 0) {
			try {
				const fiatRefillProduct = await ensureFiatRefillProduct(order.storeId);

				// Debug logging
				logger.info("Checking if order is fiat refill order", {
					metadata: {
						orderId: order.id,
						storeId: order.storeId,
						fiatRefillProductId: fiatRefillProduct.id,
						checkoutAttributes: order.checkoutAttributes,
						orderItemView: order.OrderItemView.map(
							(item: { id: string; productId: string; name: string }) => ({
								id: item.id,
								productId: item.productId,
								name: item.name,
							}),
						),
					},
					tags: ["order", "payment", "fiat", "debug", ...logTags],
				});

				const hasFiatRefillProduct = order.OrderItemView.some(
					(item: { id: string; productId: string; name: string }) =>
						item.productId === fiatRefillProduct.id,
				);

				if (hasFiatRefillProduct) {
					logger.info("Order identified as fiat refill order", {
						metadata: {
							orderId: order.id,
							storeId: order.storeId,
							fiatRefillProductId: fiatRefillProduct.id,
						},
						tags: ["order", "payment", "fiat", ...logTags],
					});
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
						tags: ["order", "payment", "fiat", ...logTags],
					},
				);
			}
		} else {
			logger.warn("Order has no OrderItemView items", {
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
					hasOrderItemView: !!order.OrderItemView,
					orderItemViewLength: order.OrderItemView?.length ?? 0,
				},
				tags: ["order", "payment", "fiat", "debug", ...logTags],
			});
		}

		return false;
	})();

	if (isAccountBalanceOrder) {
		// For Account Balance orders, use the fiat top-up processing action
		// This will handle both marking as paid AND processing fiat top-up
		logger.info("Processing Account Balance order via fiat top-up action", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
			},
			tags: ["order", "payment", "fiat", ...logTags],
		});

		const fiatResult = await processFiatTopUpAfterPaymentAction({
			orderId: order.id,
		});

		if (fiatResult?.serverError) {
			logger.error("Failed to process fiat top-up for Account Balance order", {
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
					error: fiatResult.serverError,
				},
				tags: ["order", "payment", "fiat", "error", ...logTags],
			});
			throw new SafeError(
				fiatResult.serverError || "Failed to process fiat top-up",
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

		logger.info("Account Balance order processed successfully", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
				fiatAmount: fiatResult.data?.fiatAmount,
			},
			tags: ["order", "payment", "fiat", ...logTags],
		});

		return updatedOrder;
	}
	//#endregion

	// Check if this is a Store Credit (credit refill) order
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

	// Get translation function outside transaction to avoid timeout
	const { t } = await getT();

	// Mark order as paid and create ledger entry in transaction
	// Increase timeout to 10 seconds to handle complex operations
	await sqlClient.$transaction(
		async (tx) => {
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

				// TODO: send notification to store staff when reservation is ready to confirm

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

				// HOLD design: For RSVP orders, credit the amount to customer's balance and do NOT create StoreLedger entry.
				// Revenue will be recognized when RSVP is completed.
				// - If paid with credit points: credit to CustomerCredit.point (CustomerCreditLedger type HOLD)
				// - If paid with external payment: credit to CustomerCredit.fiat (CustomerFiatLedger type TOPUP)
				if (order.userId !== null) {
					const storeForRsvp = await tx.store.findUnique({
						where: { id: order.storeId },
						select: {
							defaultTimezone: true,
							creditExchangeRate: true,
							useCustomerCredit: true,
						},
					});

					if (!storeForRsvp) {
						throw new SafeError("Store not found");
					}

					// Prepare ledger note for RSVP format
					let rsvpLedgerNote = `${paymentMethod.name || "Unknown"}, ${t("order")}:${order.orderNum || order.id}`;

					const userForNote = await tx.user.findUnique({
						where: { id: order.userId! },
						select: { name: true },
					});

					if (storeForRsvp && userForNote && rsvp.rsvpTime) {
						const rsvpTimeDate = epochToDate(rsvp.rsvpTime);
						if (rsvpTimeDate) {
							const formattedRsvpTime = format(
								getDateInTz(
									rsvpTimeDate,
									getOffsetHours(storeForRsvp.defaultTimezone || "Asia/Taipei"),
								),
								"yyyy/MM/dd HH:mm",
							);
							rsvpLedgerNote = `${paymentMethod.name || "Unknown"}, ${t("rsvp")}:${formattedRsvpTime} for ${userForNote.name}`;
						}
					}

					if (paymentMethod.payUrl === "creditPoint") {
						// RSVP paid with credit points: Use HOLD design with CustomerCreditLedger
						if (
							!storeForRsvp.useCustomerCredit ||
							!storeForRsvp.creditExchangeRate
						) {
							throw new SafeError("Store does not have credit system enabled");
						}

						const fiatAmount = Number(order.orderTotal);
						const creditExchangeRate = Number(storeForRsvp.creditExchangeRate);
						if (creditExchangeRate <= 0) {
							throw new SafeError("Invalid credit exchange rate");
						}

						// Calculate credit points from fiat amount
						const requiredCredit = fiatAmount / creditExchangeRate;

						// Get current customer credit balance
						const customerCredit = await tx.customerCredit.findUnique({
							where: {
								userId: order.userId!,
							},
						});

						const currentBalance = customerCredit
							? Number(customerCredit.point)
							: 0;
						const newBalance = currentBalance - requiredCredit; // Decrease balance (HOLD)

						if (newBalance < 0) {
							throw new SafeError("Insufficient credit balance");
						}

						// Update CustomerCredit (point field) - decrease balance (HOLD)
						await tx.customerCredit.upsert({
							where: {
								userId: order.userId!,
							},
							update: {
								point: {
									decrement: requiredCredit,
								},
								updatedAt: getUtcNowEpoch(),
							},
							create: {
								userId: order.userId!,
								point: new Prisma.Decimal(-requiredCredit),
								fiat: new Prisma.Decimal(0),
								updatedAt: getUtcNowEpoch(),
							},
						});

						// Create CustomerCreditLedger entry with HOLD type (HOLD design)
						await tx.customerCreditLedger.create({
							data: {
								storeId: order.storeId,
								userId: order.userId!,
								amount: new Prisma.Decimal(-requiredCredit), // Negative for hold
								balance: new Prisma.Decimal(newBalance),
								type: CustomerCreditLedgerType.Hold, // HOLD type
								referenceId: order.id, // Link to order (which links to RSVP)
								note: rsvpLedgerNote,
								creatorId: order.userId!, // Customer initiated payment
								createdAt: getUtcNowEpoch(),
							},
						});

						// No StoreLedger entry is created at this stage (HOLD design)
						// Revenue will be recognized when RSVP is completed
					} else if (paymentMethod.payUrl === "credit") {
						// RSVP paid with fiat credit (account balance): Use HOLD design with CustomerFiatLedger
						const fiatAmount = Number(order.orderTotal);

						// Get current customer fiat balance
						const customerCredit = await tx.customerCredit.findUnique({
							where: {
								userId: order.userId!,
							},
						});

						const currentBalance = customerCredit
							? Number(customerCredit.fiat)
							: 0;
						const newBalance = currentBalance - fiatAmount; // Decrease balance (HOLD)

						if (newBalance < 0) {
							throw new SafeError("Insufficient fiat balance");
						}

						// Update CustomerCredit (fiat field) - decrease balance (HOLD)
						await tx.customerCredit.upsert({
							where: {
								userId: order.userId!,
							},
							update: {
								fiat: {
									decrement: fiatAmount,
								},
								updatedAt: getUtcNowEpoch(),
							},
							create: {
								userId: order.userId!,
								fiat: new Prisma.Decimal(-fiatAmount),
								point: new Prisma.Decimal(0),
								updatedAt: getUtcNowEpoch(),
							},
						});

						// Create CustomerFiatLedger entry with HOLD type (HOLD design)
						await tx.customerFiatLedger.create({
							data: {
								storeId: order.storeId,
								userId: order.userId!,
								amount: new Prisma.Decimal(-fiatAmount), // Negative for hold
								balance: new Prisma.Decimal(newBalance),
								type: "HOLD", // HOLD type
								referenceId: order.id, // Link to order (which links to RSVP)
								note: rsvpLedgerNote,
								creatorId: order.userId!, // Customer initiated payment
								createdAt: getUtcNowEpoch(),
							},
						});

						// No StoreLedger entry is created at this stage (HOLD design)
						// Revenue will be recognized when RSVP is completed
					} else {
						// RSVP paid with external payment: Use HOLD design with CustomerFiatLedger
						const fiatAmount = Number(order.orderTotal);

						// Get current customer fiat balance
						const customerCredit = await tx.customerCredit.findUnique({
							where: {
								userId: order.userId!,
							},
						});

						const currentBalance = customerCredit
							? Number(customerCredit.fiat)
							: 0;
						const newBalance = currentBalance + fiatAmount;

						// Update CustomerCredit (fiat field)
						await tx.customerCredit.upsert({
							where: {
								userId: order.userId!,
							},
							update: {
								fiat: {
									increment: fiatAmount,
								},
								updatedAt: getUtcNowEpoch(),
							},
							create: {
								userId: order.userId!,
								fiat: new Prisma.Decimal(fiatAmount),
								point: new Prisma.Decimal(0),
								updatedAt: getUtcNowEpoch(),
							},
						});

						// Create CustomerFiatLedger entry with TOPUP type (HOLD design)
						// Note: Using TOPUP type for now since CustomerFiatLedger doesn't have HOLD type yet
						// This will be treated as "held" until RSVP is completed
						await tx.customerFiatLedger.create({
							data: {
								storeId: order.storeId,
								userId: order.userId!,
								amount: new Prisma.Decimal(fiatAmount), // Positive for credit
								balance: new Prisma.Decimal(newBalance),
								type: "TOPUP", // Using TOPUP for now (HOLD design)
								referenceId: order.id, // Link to order (which links to RSVP)
								note: rsvpLedgerNote,
								creatorId: order.userId!, // Customer initiated payment
								createdAt: getUtcNowEpoch(),
							},
						});

						// No StoreLedger entry is created at this stage (HOLD design)
						// Revenue will be recognized when RSVP is completed
					}

					// Skip StoreLedger creation for all RSVP orders (HOLD design)
					return;
				}
			}

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

			// Create StoreLedger entry (for non-RSVP orders only)
			// Skip StoreLedger for all RSVP orders (HOLD design - revenue recognized on completion)
			if (!rsvp) {
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
