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
// when cancel within cancelHours window, refund to either credit or fiat depending on how the reservation was paid.
// when cancel outside cancelHours window, no refund is given.
//
export const cancelReservationAction = baseClient
	.metadata({ name: "cancelReservation" })
	.schema(cancelReservationSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

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

		// Process refund if reservation was prepaid (alreadyPaid = true)
		// Only refund if cancellation is WITHIN the cancelHours window
		// If cancellation is OUTSIDE the cancelHours window, no refund is given
		const isWithinCancelHours = isCancellationWithinCancelHours(
			rsvpSettings,
			existingRsvp.rsvpTime,
		);

		// Track if refund was needed and if it completed successfully
		let refundCompleted = false;
		const refundNeeded =
			existingRsvp.alreadyPaid &&
			existingRsvp.customerId &&
			isWithinCancelHours;

		if (refundNeeded) {
			const { t } = await getT();

			// Determine payment method: check for credit points first, otherwise assume fiat
			let paymentMethod: "credit" | "fiat" | null = null;

			if (existingRsvp.orderId && existingRsvp.customerId) {
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
					// If not credit, assume fiat
					paymentMethod = "fiat";
				}
			} else {
				// No orderId, assume fiat payment directly linked to RSVP
				paymentMethod = "fiat";
			}

			logger.info("Ready to cancel reservation and process refund", {
				metadata: {
					rsvpId: id,
					storeId: existingRsvp.storeId,
					customerId: existingRsvp.customerId,
					orderId: existingRsvp.orderId,
					paymentMethod: paymentMethod,
				},
			});

			// Process refund based on payment method and check if it succeeded
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
				logger.error("Invalid payment method", {
					metadata: {
						rsvpId: id,
						storeId: existingRsvp.storeId,
						customerId: existingRsvp.customerId,
						orderId: existingRsvp.orderId,
						paymentMethod: paymentMethod,
					},
				});
				throw new SafeError("Invalid payment method");
			}

			// If refund was needed but didn't complete, throw error
			if (!refundCompleted) {
				throw new SafeError(
					"Refund processing failed. Reservation was not cancelled.",
				);
			}
		}

		// Only update RSVP status to Cancelled if:
		// 1. No refund was needed (alreadyPaid is false OR outside cancelHours), OR
		// 2. Refund was successfully completed
		// (If we reach here, either no refund was needed or refund completed successfully)
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
