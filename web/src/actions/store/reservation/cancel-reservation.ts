"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { RsvpStatus, CustomerCreditLedgerType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { cancelReservationSchema } from "./cancel-reservation.validation";
import { isCancellationWithinCancelHours } from "./validate-cancel-hours";
import { processRsvpCreditPointsRefund } from "./process-rsvp-refund-credit-point";
import { processRsvpFiatRefund } from "./process-rsvp-refund-fiat";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";

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
			throw new SafeError("Reservation not found");
		}

		// Validate store context: ensure reservation belongs to the specified store
		if (existingRsvp.storeId !== storeId) {
			throw new SafeError("Reservation does not belong to the specified store");
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
			throw new SafeError(
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

				logger.info("Processing refund for paid order", {
					metadata: {
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						orderIsPaid: order.isPaid,
						paymentMethod: paymentMethod,
						isWithinCancelHours: isWithinCancelHours,
					},
				});

				// Process refund based on payment method
				if (paymentMethod === "credit") {
					const refundResult = await processRsvpCreditPointsRefund({
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						refundReason: t("reservation_cancelled_by_customer"),
					});
					refundCompleted = refundResult.refunded;
				} else if (paymentMethod === "fiat") {
					const refundResult = await processRsvpFiatRefund({
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						refundReason: t("reservation_cancelled_by_customer"),
					});
					refundCompleted = refundResult.refunded;
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
							tags: ["refund", "payment-detection"],
						},
					);
					refundCompleted = false;
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
					Facility: true,
					Order: true,
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation cancellation failed.");
			}

			throw error;
		}
	});
