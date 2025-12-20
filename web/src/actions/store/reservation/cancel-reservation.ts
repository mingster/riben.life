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
import { validateCancelHoursWindow } from "./validate-cancel-hours";
import { processRsvpCreditRefund } from "./process-rsvp-refund";
import { getT } from "@/app/i18n";

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

		// Fetch RsvpSettings for cancelHours validation
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId: existingRsvp.storeId },
			select: {
				canCancel: true,
				cancelHours: true,
			},
		});

		// Validate cancelHours window
		validateCancelHoursWindow(rsvpSettings, existingRsvp.rsvpTime, "cancel");

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
		if (existingRsvp.alreadyPaid && existingRsvp.orderId) {
			const { t } = await getT();

			// Get refund amount for the refund reason message
			let refundPoints: number | undefined;
			if (existingRsvp.orderId && existingRsvp.customerId) {
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
					refundPoints = Math.abs(Number(spendEntry.amount));
				}
			}

			await processRsvpCreditRefund({
				rsvpId: id,
				storeId: existingRsvp.storeId,
				customerId: existingRsvp.customerId,
				orderId: existingRsvp.orderId,
				refundReason: refundPoints
					? t("reservation_cancelled_by_customer", { points: refundPoints })
					: t("reservation_cancelled_by_customer"),
			});
		}

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
