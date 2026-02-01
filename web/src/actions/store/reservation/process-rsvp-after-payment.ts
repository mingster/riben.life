"use server";

import { processRsvpAfterPaymentSchema } from "./process-rsvp-after-payment.validation";
import { baseClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { RsvpStatus, CustomerCreditLedgerType } from "@/types/enum";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

/**
 * Process RSVP after payment is paid.
 * This action:
 * 1. Updates RSVP status (Pending -> Ready/ReadyToConfirm based on noNeedToConfirm setting)
 * 2. Marks RSVP as already paid
 * 3. Creates customer ledger entries (credit points or fiat) based on payment method
 * 4. Uses HOLD design - no StoreLedger entry is created (revenue recognized on RSVP completion)
 */
export const processRsvpAfterPaymentAction = baseClient
	.metadata({ name: "processRsvpAfterPayment" })
	.schema(processRsvpAfterPaymentSchema)
	.action(async ({ parsedInput }) => {
		const { orderId } = parsedInput;

		// Get order with all necessary relations
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						id: true,
						defaultTimezone: true,
						creditExchangeRate: true,
						useCustomerCredit: true,
					},
				},
				PaymentMethod: {
					select: {
						id: true,
						name: true,
						payUrl: true,
					},
				},
				User: {
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

		if (!order.PaymentMethod) {
			throw new SafeError("Payment method not found");
		}

		// Check if this order is for an RSVP reservation
		const rsvp = await sqlClient.rsvp.findFirst({
			where: { orderId: order.id },
		});

		if (!rsvp) {
			throw new SafeError("RSVP not found for this order");
		}

		// Check idempotency: If RSVP is already paid, skip processing
		if (rsvp.alreadyPaid) {
			logger.info("RSVP already processed after payment", {
				metadata: {
					rsvpId: rsvp.id,
					orderId: order.id,
				},
				tags: ["rsvp", "payment", "idempotency"],
			});

			return {
				success: true,
				message: "RSVP already processed",
				rsvpId: rsvp.id,
			};
		}

		// Get translation function
		const { t } = await getT();

		// Process RSVP update and customer ledger entries in a transaction
		const { newStatus } = await sqlClient.$transaction(async (tx) => {
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
			// Link customerId when anonymous RSVP is paid by logged-in user (order.userId)
			// so it shows in reservation/history
			await tx.rsvp.update({
				where: { id: rsvp.id },
				data: {
					alreadyPaid: true,
					paidAt: now,
					status: newStatus,
					confirmedByStore: shouldAutoConfirm ? true : rsvp.confirmedByStore,
					updatedAt: now,
					// Link anonymous RSVP to paying user so it appears in rsvp/history
					...(rsvp.customerId == null &&
						order.userId != null && {
							customerId: order.userId,
						}),
				},
			});

			logger.info("RSVP updated after order payment", {
				metadata: {
					rsvpId: rsvp.id,
					orderId: order.id,
					previousStatus: rsvp.status,
					newStatus: newStatus,
					noNeedToConfirm: rsvpSettings?.noNeedToConfirm ?? false,
					autoConfirmed: shouldAutoConfirm,
				},
				tags: ["rsvp", "payment", "order"],
			});

			// HOLD design: For RSVP orders, credit the amount to customer's balance and do NOT create StoreLedger entry.
			// Revenue will be recognized when RSVP is completed.
			// - If paid with credit points: 1. mark RSVP as pay. 2. Deduce CustomerCredit.point (CustomerCreditLedger type HOLD)
			// - If paid with fiat balance: 1. mark RSVP as pay. 2. Deduce CustomerCredit.fiat (CustomerCreditLedger type HOLD)
			// - If paid with external payment: 1. mark RSVP as pay.
			// 2. Credit to CustomerCredit.fiat (CustomerCreditLedger type TOPUP)
			// 3. Deduce CustomerCredit.fiat (CustomerCreditLedger type HOLD)
			//
			if (order.userId !== null) {
				const storeForRsvp = order.Store;
				// paymentMethod is guaranteed to be non-null due to check above
				const paymentMethod = order.PaymentMethod!;
				const userForNote = order.User;

				// Prepare ledger note for RSVP
				let rsvpLedgerNote = t("customer_ledger_note_rsvp_payment_order", {
					paymentMethod:
						paymentMethod.name || t("unknown_payment_method") || "Unknown",
					orderNum: order.orderNum || order.id,
				});

				if (storeForRsvp && userForNote && rsvp.rsvpTime) {
					const rsvpTimeDate = epochToDate(rsvp.rsvpTime);
					if (rsvpTimeDate) {
						const datetimeFormat = t("datetime_format");
						const formattedRsvpTime = format(
							getDateInTz(
								rsvpTimeDate,
								getOffsetHours(storeForRsvp.defaultTimezone || "Asia/Taipei"),
							),
							`${datetimeFormat} HH:mm`,
						);
						rsvpLedgerNote = t("customer_ledger_note_rsvp_payment", {
							paymentMethod:
								paymentMethod.name || t("unknown_payment_method") || "Unknown",
							rsvpTime: formattedRsvpTime,
						});
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

					logger.info("RSVP paid with credit points - HOLD created", {
						metadata: {
							rsvpId: rsvp.id,
							orderId: order.id,
							requiredCredit,
							newBalance,
						},
						tags: ["rsvp", "payment", "credit", "hold"],
					});
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
							type: "HOLD", // HOLD type (string, not enum)
							referenceId: order.id, // Link to order (which links to RSVP)
							note: rsvpLedgerNote,
							creatorId: order.userId!, // Customer initiated payment
							createdAt: getUtcNowEpoch(),
						},
					});

					logger.info("RSVP paid with fiat credit - HOLD created", {
						metadata: {
							rsvpId: rsvp.id,
							orderId: order.id,
							fiatAmount,
							newBalance,
						},
						tags: ["rsvp", "payment", "fiat", "hold"],
					});
				} else {
					// RSVP paid with external payment: Use HOLD design with CustomerFiatLedger
					// Step 1: Credit to CustomerCredit.fiat (CustomerCreditLedger type TOPUP)
					// Step 2: Deduct CustomerCredit.fiat (CustomerCreditLedger type HOLD)
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

					// Step 1: Credit the fiat balance (TOPUP)
					const balanceAfterTopup = currentBalance + fiatAmount;

					// Update CustomerCredit (fiat field) - increment for TOPUP
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

					// Create CustomerFiatLedger entry with TOPUP type
					await tx.customerFiatLedger.create({
						data: {
							storeId: order.storeId,
							userId: order.userId!,
							amount: new Prisma.Decimal(fiatAmount), // Positive for credit
							balance: new Prisma.Decimal(balanceAfterTopup),
							type: CustomerCreditLedgerType.Topup, // TOPUP type (string, not enum)
							referenceId: order.id, // Link to order (which links to RSVP)
							note: rsvpLedgerNote,
							creatorId: order.userId!, // Customer initiated payment
							createdAt: getUtcNowEpoch(),
						},
					});

					// Step 2: Deduct the fiat balance (HOLD)
					const finalBalance = balanceAfterTopup - fiatAmount;

					// Update CustomerCredit (fiat field) - decrement for HOLD
					await tx.customerCredit.update({
						where: {
							userId: order.userId!,
						},
						data: {
							fiat: {
								decrement: fiatAmount,
							},
							updatedAt: getUtcNowEpoch(),
						},
					});

					// Create CustomerFiatLedger entry with HOLD type
					await tx.customerFiatLedger.create({
						data: {
							storeId: order.storeId,
							userId: order.userId!,
							amount: new Prisma.Decimal(-fiatAmount), // Negative for hold
							balance: new Prisma.Decimal(finalBalance),
							type: CustomerCreditLedgerType.Hold, // HOLD type (string, not enum)
							referenceId: order.id, // Link to order (which links to RSVP)
							note: rsvpLedgerNote,
							creatorId: order.userId!, // Customer initiated payment
							createdAt: getUtcNowEpoch(),
						},
					});

					logger.info(
						"RSVP paid with external payment - TOPUP and HOLD created",
						{
							metadata: {
								rsvpId: rsvp.id,
								orderId: order.id,
								fiatAmount,
								balanceAfterTopup,
								finalBalance,
								paymentMethod: paymentMethod.name,
							},
							tags: ["rsvp", "payment", "external", "topup", "hold"],
						},
					);
				}

				// No StoreLedger entry is created at this stage (HOLD design)
				// Revenue will be recognized when RSVP is completed
			}
			return { newStatus };
		});

		// Re-fetch RSVP with relations for notification context
		const rsvpWithRelations = await sqlClient.rsvp.findUnique({
			where: { id: rsvp.id },
			include: {
				Store: { select: { name: true, ownerId: true } },
				Customer: { select: { name: true, email: true, phoneNumber: true } },
				Facility: { select: { facilityName: true } },
			},
		});

		if (!rsvpWithRelations) {
			return {
				success: true,
				message: "RSVP processed successfully",
				rsvpId: rsvp.id,
			};
		}

		const notificationRouter = getRsvpNotificationRouter();
		const baseContext = {
			rsvpId: rsvpWithRelations.id,
			storeId: rsvpWithRelations.storeId,
			customerId: rsvpWithRelations.customerId,
			customerName:
				rsvpWithRelations.Customer?.name || rsvpWithRelations.name || null,
			customerEmail: rsvpWithRelations.Customer?.email ?? null,
			customerPhone:
				rsvpWithRelations.Customer?.phoneNumber ??
				rsvpWithRelations.phone ??
				null,
			storeName: rsvpWithRelations.Store?.name ?? null,
			storeOwnerId: rsvpWithRelations.Store?.ownerId ?? null,
			rsvpTime: rsvpWithRelations.rsvpTime,
			status: newStatus,
			previousStatus: rsvp.status,
			facilityName: rsvpWithRelations.Facility?.facilityName ?? null,
			numOfAdult: rsvpWithRelations.numOfAdult,
			numOfChild: rsvpWithRelations.numOfChild,
			message: rsvpWithRelations.message ?? null,
			actionUrl: `/storeAdmin/${rsvpWithRelations.storeId}/rsvp/history`,
		};

		// Notify store staff: payment received for reservation
		await notificationRouter.routeNotification({
			...baseContext,
			eventType: "payment_received",
		});

		// Notify customer on RSVP status
		if (newStatus === RsvpStatus.Ready) {
			await notificationRouter.routeNotification({
				...baseContext,
				eventType: "ready",
			});
		} else if (newStatus === RsvpStatus.ReadyToConfirm) {
			await notificationRouter.routeNotification({
				...baseContext,
				eventType: "status_changed",
			});
		}

		return {
			success: true,
			message: "RSVP processed successfully",
			rsvpId: rsvp.id,
		};
	});
