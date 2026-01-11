"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus, CustomerCreditLedgerType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { cancelRsvpSchema } from "./cancel-rsvp.validation";
import { isCancellationWithinCancelHours } from "@/actions/store/reservation/validate-cancel-hours";
import { processRsvpCreditPointsRefund } from "@/actions/store/reservation/process-rsvp-refund-credit-point";
import { processRsvpFiatRefund } from "@/actions/store/reservation/process-rsvp-refund-fiat";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

// Store admin can cancel any RSVP in their store.
// Refunds are processed based on cancelHours window (same as customer cancellation).
// If cancellation is OUTSIDE cancelHours window, refund is processed.
// If cancellation is WITHIN cancelHours window, no refund is given.
export const cancelRsvpAction = storeActionClient
	.metadata({ name: "cancelRsvp" })
	.schema(cancelRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		// Get the existing RSVP with Order included
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: true,
				Order: {
					include: {
						PaymentMethod: true,
					},
				},
			},
		});

		if (!existingRsvp) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_reservation_not_found") || "Reservation not found",
			);
		}

		// Validate store context: ensure reservation belongs to the specified store
		if (existingRsvp.storeId !== storeId) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_reservation_not_belong_to_store") ||
					"Reservation does not belong to the specified store",
			);
		}

		// Check if RSVP is already cancelled
		if (existingRsvp.status === RsvpStatus.Cancelled) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_already_cancelled") || "Reservation is already cancelled",
			);
		}

		// Fetch RsvpSettings for refund determination
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId: existingRsvp.storeId },
			select: {
				canCancel: true,
				cancelHours: true,
			},
		});

		// Process refund if cancellation is OUTSIDE the cancelHours window
		// If cancellation is WITHIN the cancelHours window, no refund is given
		const isWithinCancelHours = isCancellationWithinCancelHours(
			rsvpSettings,
			existingRsvp.rsvpTime,
		);

		// Track if refund was needed and if it completed successfully
		let refundCompleted = false;
		let refundAmount: number | null = null;
		// Refund is needed when cancellation is OUTSIDE the cancelHours window (!isWithinCancelHours)
		const refundNeeded = !isWithinCancelHours;

		if (refundNeeded && existingRsvp.orderId && existingRsvp.Order) {
			const order = existingRsvp.Order;

			// Check if order is paid
			if (order.isPaid && existingRsvp.customerId) {
				const { t } = await getT();

				// Determine payment method: check for credit points first, then fiat
				let paymentMethod: "credit" | "fiat" | null = null;

				// Check for credit points payment
				const spendEntry = await sqlClient.customerCreditLedger.findFirst({
					where: {
						storeId: existingRsvp.storeId,
						userId: existingRsvp.customerId,
						referenceId: existingRsvp.orderId,
						type: CustomerCreditLedgerType.Spend,
					},
					orderBy: {
						createdAt: "desc",
					},
				});

				if (spendEntry) {
					paymentMethod = "credit";
				} else {
					paymentMethod = "fiat";
				}

				logger.info(
					"Processing refund for paid order (store admin cancellation)",
					{
						metadata: {
							rsvpId: id,
							storeId: existingRsvp.storeId,
							customerId: existingRsvp.customerId,
							orderId: existingRsvp.orderId,
							orderIsPaid: order.isPaid,
							paymentMethod: paymentMethod,
							isWithinCancelHours: isWithinCancelHours,
						},
						tags: ["rsvp", "cancellation", "store-admin"],
					},
				);

				// Process refund based on payment method
				if (paymentMethod === "credit") {
					const refundResult = await processRsvpCreditPointsRefund({
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						refundReason:
							t("notifications_rsvp_cancelled") ||
							"Store cancelled your reservation.",
					});
					refundCompleted = refundResult.refunded;
					refundAmount = refundResult.refundAmount ?? null;
				} else if (paymentMethod === "fiat") {
					const refundResult = await processRsvpFiatRefund({
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						refundReason:
							t("notifications_rsvp_cancelled") ||
							"Store cancelled your reservation.",
					});
					refundCompleted = refundResult.refunded;
					refundAmount = refundResult.refundAmount ?? null;
				} else {
					// No credit or fiat payment found - might be paid through other method (Stripe, LINE Pay, etc.)
					logger.warn(
						"Cannot refund: payment method not found or not refundable through credit/fiat system",
						{
							metadata: {
								rsvpId: id,
								storeId: existingRsvp.storeId,
								customerId: existingRsvp.customerId,
								orderId: existingRsvp.orderId,
								orderPaymentMethod: order.PaymentMethod?.name,
							},
							tags: ["refund", "payment-detection", "store-admin"],
						},
					);
					refundCompleted = false;
					refundAmount = null;
				}

				// If refund was needed but didn't complete, log warning
				if (!refundCompleted) {
					logger.warn(
						"Refund processing failed or payment method not refundable (store admin cancellation)",
						{
							metadata: {
								rsvpId: id,
								storeId: existingRsvp.storeId,
								customerId: existingRsvp.customerId,
								orderId: existingRsvp.orderId,
								paymentMethod: paymentMethod,
								orderPaymentMethod: order.PaymentMethod?.name,
							},
							tags: ["refund", "warning", "store-admin"],
						},
					);
				}
			}
		}

		// Update RSVP status to Cancelled
		// Note: We allow cancellation even if refund fails (e.g., payment through external methods)

		logger.info("Cancelling reservation (store admin)", {
			metadata: {
				rsvpId: id,
				storeId: existingRsvp.storeId,
				alreadyPaid: existingRsvp.alreadyPaid,
				customerId: existingRsvp.customerId,
				isWithinCancelHours: isWithinCancelHours,
				refundNeeded: refundNeeded,
				refundCompleted: refundCompleted,
			},
			tags: ["rsvp", "cancellation", "store-admin"],
		});

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					status: RsvpStatus.Cancelled,
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Order: true,
					Facility: true,
					FacilityPricingRule: true,
					ServiceStaff: {
						include: {
							User: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			// Send notification for reservation cancellation
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: updated.id,
				storeId: updated.storeId,
				eventType: "cancelled",
				customerId: updated.customerId,
				customerName: updated.Customer?.name || updated.name || null,
				customerEmail: updated.Customer?.email || null,
				customerPhone: updated.Customer?.phoneNumber || updated.phone || null,
				storeName: updated.Store?.name || null,
				rsvpTime: updated.rsvpTime,
				arriveTime: updated.arriveTime,
				status: updated.status,
				previousStatus: existingRsvp.status,
				facilityName: updated.Facility?.facilityName || null,
				serviceStaffName:
					updated.ServiceStaff?.User?.name ||
					updated.ServiceStaff?.User?.email ||
					null,
				numOfAdult: updated.numOfAdult,
				numOfChild: updated.numOfChild,
				message: updated.message || null,
				refundAmount:
					refundCompleted && refundAmount !== null ? refundAmount : null,
				refundCurrency: existingRsvp.Store?.defaultCurrency || null,
				actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
			});

			return {
				rsvp: transformedRsvp,
				refundCompleted,
				refundAmount,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_cancellation_failed") || "Reservation cancellation failed.",
				);
			}

			throw error;
		}
	});
