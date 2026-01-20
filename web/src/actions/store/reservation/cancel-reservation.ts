"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { RsvpStatus } from "@/types/enum";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";

import { cancelReservationSchema } from "./cancel-reservation.validation";
import { isCancellationWithinCancelHours } from "./validate-cancel-hours";
import { processRsvpCreditPointsRefund } from "./process-rsvp-refund-credit-point";
import { processRsvpFiatRefund } from "./process-rsvp-refund-fiat";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";

// customer can cancel their reservation at any time if canCancel is true in rsvpSettings.
// when cancel OUTSIDE cancelHours window, refund to either credit or fiat depending on how the reservation was paid.
// when cancel WITHIN cancelHours window, no refund is given.
//
export const cancelReservationAction = baseClient
	.metadata({ name: "cancelReservation" })
	.schema(cancelReservationSchema)
	.action(async ({ parsedInput }) => {
		const { id, storeId } = parsedInput;

		// Get session to check if user is logged in
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const sessionUserId = session?.user?.id;
		const sessionUserEmail = session?.user?.email;

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

		// Fetch RsvpSettings for refund determination
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId: existingRsvp.storeId },
			select: {
				canCancel: true,
				cancelHours: true,
			},
		});

		// Verify ownership: user must be logged in and match customerId, or match by email
		let hasPermission = false;

		if (sessionUserId && existingRsvp.customerId) {
			hasPermission = existingRsvp.customerId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.Customer?.email) {
			hasPermission = existingRsvp.Customer.email === sessionUserEmail;
		}

		if (!hasPermission) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_no_permission_to_cancel") ||
					"You do not have permission to cancel this reservation",
			);
		}

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

		// Update RSVP status to Cancelled
		// Note: We allow cancellation even if refund fails (e.g., payment through external methods)

		logger.info("Cancelling reservation", {
			metadata: {
				rsvpId: id,
				storeId: existingRsvp.storeId,
				alreadyPaid: existingRsvp.alreadyPaid,
				customerId: existingRsvp.customerId,
				isWithinCancelHours: isWithinCancelHours,
				refundNeeded: refundNeeded,
				refundCompleted: refundCompleted,
			},
		});

		// Wrap refund processing and status update in a transaction to ensure atomicity
		// NOTE: The refund functions (processRsvpCreditPointsRefund, processRsvpFiatRefund) now
		// accept an optional transaction client parameter. If provided, they use it instead of
		// creating a new transaction, ensuring true atomicity within a single transaction.
		try {
			const result = await sqlClient.$transaction(async (tx) => {
				// First, update RSVP status to Cancelled within the transaction
				const updated = await tx.rsvp.update({
					where: { id },
					data: {
						status: RsvpStatus.Cancelled,
						updatedAt: getUtcNowEpoch(),
					},
					include: {
						Store: true,
						Customer: true,
						Facility: true,
						Order: true,
					},
				});

				// Process refund if needed (before status update, within the same transaction)
				// NOTE: These functions now accept an optional transaction client parameter.
				// When provided, they use it instead of creating a new transaction, ensuring
				// true atomicity within a single transaction.
				if (refundNeeded && existingRsvp.orderId && existingRsvp.Order) {
					const order = existingRsvp.Order;

					// Check if order is paid
					if (order.isPaid && existingRsvp.customerId) {
						const { t } = await getT();

						// Refund logic: There are only 2 types of refund:
						// 1. If paid by credit points (payUrl === "creditPoint"), refund to credit points
						// 2. All other scenarios (fiat balance, Stripe, LINE Pay, etc.) refund to fiat
						//
						// Determine payment method from order's PaymentMethod.payUrl
						const paymentMethodPayUrl = order.PaymentMethod?.payUrl;
						const paymentMethod: "credit" | "fiat" =
							paymentMethodPayUrl === "creditPoint" ? "credit" : "fiat";

						// Format rsvpTime for refund reason using i18n datetime format
						const storeTimezone =
							existingRsvp.Store?.defaultTimezone || "Asia/Taipei";
						const datetimeFormat = t("datetime_format");
						const rsvpTimeDate = epochToDate(existingRsvp.rsvpTime);
						let formattedRsvpTime = "";
						if (rsvpTimeDate) {
							const storeDate = getDateInTz(
								rsvpTimeDate,
								getOffsetHours(storeTimezone),
							);
							formattedRsvpTime = format(storeDate, `${datetimeFormat} HH:mm`);
						}

						const refundReason = t("reservation_cancelled_by_customer", {
							rsvpTime: formattedRsvpTime || String(existingRsvp.rsvpTime),
						});

						// Process refund based on payment method
						// paymentMethod is always "credit" or "fiat" (never null)
						if (paymentMethod === "credit") {
							const refundResult = await processRsvpCreditPointsRefund({
								rsvpId: id,
								storeId: existingRsvp.storeId,
								customerId: existingRsvp.customerId,
								orderId: existingRsvp.orderId,
								refundReason: refundReason,
								tx, // Pass transaction client for atomicity
							});
							refundCompleted = refundResult.refunded;
							refundAmount = refundResult.refundAmount ?? null;
						} else {
							// refund to customer's fiat balance
							// This covers fiat balance payments and external payment methods (Stripe, LINE Pay, etc.)
							const refundResult = await processRsvpFiatRefund({
								rsvpId: id,
								storeId: existingRsvp.storeId,
								customerId: existingRsvp.customerId,
								orderId: existingRsvp.orderId,
								refundReason: refundReason,
								tx, // Pass transaction client for atomicity
							});
							refundCompleted = refundResult.refunded;
							refundAmount = refundResult.refundAmount ?? null;
						}

						// If refund was needed but didn't complete, log warning
						if (!refundCompleted) {
							logger.warn(
								"Refund processing failed or payment method not refundable",
								{
									metadata: {
										rsvpId: id,
										storeId: existingRsvp.storeId,
										customerId: existingRsvp.customerId,
										orderId: existingRsvp.orderId,
										paymentMethod: paymentMethod,
										orderPaymentMethod: order.PaymentMethod?.name,
									},
									tags: ["refund", "warning"],
								},
							);
						}
					}
				}

				return {
					updated,
					refundCompleted,
					refundAmount,
				};
			});

			const transformedRsvp = { ...result.updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			// Send notification for reservation cancellation
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: result.updated.id,
				storeId: result.updated.storeId,
				eventType: "cancelled",
				customerId: result.updated.customerId,
				customerName:
					result.updated.Customer?.name || result.updated.name || null,
				customerEmail: result.updated.Customer?.email || null,
				customerPhone:
					result.updated.Customer?.phoneNumber || result.updated.phone || null,
				storeName: result.updated.Store?.name || null,
				rsvpTime: result.updated.rsvpTime,
				status: result.updated.status,
				facilityName: result.updated.Facility?.facilityName || null,
				numOfAdult: result.updated.numOfAdult,
				numOfChild: result.updated.numOfChild,
				refundAmount:
					result.refundCompleted && result.refundAmount !== null
						? result.refundAmount
						: null,
				refundCurrency: existingRsvp.Store?.defaultCurrency || null,
				actionUrl: `/s/${result.updated.storeId}/reservation/history`,
			});

			return {
				rsvp: transformedRsvp,
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
