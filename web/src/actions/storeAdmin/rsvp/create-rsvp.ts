"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	dateToEpoch,
	getUtcNowEpoch,
	convertDateToUtc,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { createRsvpSchema } from "./create-rsvp.validation";
import { deduceCustomerCredit } from "./deduce-customer-credit";
import { validateReservationTimeWindow } from "@/actions/store/reservation/validate-reservation-time-window";
import { validateRsvpAvailability } from "@/actions/store/reservation/validate-rsvp-availability";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";

// Create RSVP by admin or store staff
//
export const createRsvpAction = storeActionClient
	.metadata({ name: "createRsvp" })
	.schema(createRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			customerId,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			arriveTime: arriveTimeInput,
			status,
			message,
			alreadyPaid,
			confirmedByStore,
			confirmedByCustomer,
			facilityCost,
			pricingRuleId,
		} = parsedInput;

		// Fetch store to get timezone, creditServiceExchangeRate, creditExchangeRate, defaultCurrency, and useCustomerCredit
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				defaultTimezone: true,
				creditServiceExchangeRate: true,
				creditExchangeRate: true,
				defaultCurrency: true,
				useCustomerCredit: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		// Validate facility (required)
		if (!facilityId) {
			throw new SafeError("Facility is required");
		}

		const facility = await sqlClient.storeFacility.findFirst({
			where: {
				id: facilityId,
				storeId,
			},
			select: {
				id: true,
				facilityName: true,
				defaultDuration: true,
				defaultCost: true,
			},
		});

		if (!facility) {
			throw new SafeError("Facility not found");
		}

		// Convert rsvpTime to UTC Date, then to BigInt epoch
		// The Date object from datetime-local input represents a time in the browser's local timezone
		// We need to interpret it as store timezone time and convert to UTC
		let rsvpTimeUtc: Date;
		try {
			rsvpTimeUtc = convertDateToUtc(rsvpTimeInput, storeTimezone);
		} catch (error) {
			throw new SafeError(
				error instanceof Error
					? error.message
					: "Failed to convert rsvpTime to UTC",
			);
		}

		const rsvpTime = dateToEpoch(rsvpTimeUtc);
		if (!rsvpTime) {
			throw new SafeError("Failed to convert rsvpTime to epoch");
		}

		// Get RSVP settings for time window validation, availability checking, and prepaid payment
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
			select: {
				canReserveBefore: true,
				canReserveAfter: true,
				singleServiceMode: true,
				defaultDuration: true,
				minPrepaidPercentage: true,
			},
		});

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		// Note: Store admin can still create reservations, but we validate to ensure consistency
		validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Validate availability based on singleServiceMode
		await validateRsvpAvailability(
			storeId,
			rsvpSettings,
			rsvpTime,
			facilityId,
			facility.defaultDuration,
		);

		// Convert arriveTime to UTC Date, then to BigInt epoch
		// Same conversion as rsvpTime - interpret as store timezone and convert to UTC
		const arriveTime =
			arriveTimeInput instanceof Date
				? (() => {
						try {
							const utcDate = convertDateToUtc(arriveTimeInput, storeTimezone);
							return dateToEpoch(utcDate);
						} catch {
							// Return null if conversion fails (invalid date)
							return null;
						}
					})()
				: null;

		// Get current user ID for createdBy field
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const createdBy = session?.user?.id || null;

		// Calculate total cost: use facilityCost if provided, otherwise use facility.defaultCost
		const totalCost =
			facilityCost !== null && facilityCost !== undefined
				? facilityCost
				: facility.defaultCost
					? Number(facility.defaultCost)
					: null;

		// For admin-created RSVPs, we don't process prepaid payment (no credit deduction)
		// Just create an unpaid store order for the customer to pay later
		// Use the provided status and alreadyPaid values
		const finalStatus = status;
		const finalAlreadyPaid = alreadyPaid;
		let finalOrderId: string | null = null;

		try {
			const rsvp = await sqlClient.$transaction(async (tx) => {
				const createdRsvp = await tx.rsvp.create({
					data: {
						storeId,
						customerId: customerId || null,
						facilityId,
						numOfAdult,
						numOfChild,
						rsvpTime,
						arriveTime: arriveTime || null,
						status: finalStatus,
						message: message || null,
						alreadyPaid: finalAlreadyPaid,
						orderId: finalOrderId || null,
						confirmedByStore,
						confirmedByCustomer,
						facilityCost:
							facilityCost !== null && facilityCost !== undefined
								? facilityCost
								: null,
						pricingRuleId: pricingRuleId || null,
						createdBy,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
					include: {
						Store: true,
						Customer: true,
						CreatedBy: true,
						Order: true,
						Facility: true,
						FacilityPricingRule: true,
					},
				});

				// If status is Completed, not alreadyPaid, and has customerId, deduct customer's credit
				// Note: This is for service credit usage (after service completion), not prepaid payment
				if (
					finalStatus === RsvpStatus.Completed &&
					!finalAlreadyPaid &&
					customerId &&
					store.creditServiceExchangeRate &&
					Number(store.creditServiceExchangeRate) > 0 &&
					store.creditExchangeRate &&
					Number(store.creditExchangeRate) > 0
				) {
					const duration = facility.defaultDuration || 60; // Default to 60 minutes if not set
					const creditServiceExchangeRate = Number(
						store.creditServiceExchangeRate,
					);
					const creditExchangeRate = Number(store.creditExchangeRate);
					const defaultCurrency = store.defaultCurrency || "twd";

					await deduceCustomerCredit({
						tx,
						storeId,
						customerId,
						rsvpId: createdRsvp.id,
						facilityId: facility.id,
						duration,
						creditServiceExchangeRate,
						creditExchangeRate,
						defaultCurrency,
						createdBy: createdBy || null,
					});
				} else {
					// Create unpaid store order for customer to pay for the RSVP
					// This allows the customer to view and pay for the reservation
					if (customerId && totalCost !== null && totalCost > 0) {
						// Get translation function for order note
						const { t } = await getT();

						// Format RSVP time in store timezone for display
						const rsvpTimeDate = epochToDate(createdRsvp.rsvpTime);
						const formattedRsvpTime = rsvpTimeDate
							? format(
									getDateInTz(rsvpTimeDate, getOffsetHours(storeTimezone)),
									"yyyy-MM-dd HH:mm",
								)
							: "";

						// Build order note with RSVP details
						const baseNote = t("rsvp_reservation_payment_note");
						const facilityName =
							facility.facilityName || t("facility_name") || "Facility";

						const orderNote = `${baseNote}\n${t("rsvp_id") || "RSVP ID"}: ${createdRsvp.id}\n${t("facility_name") || "Facility"}: ${facilityName}\n${t("rsvp_time") || "Reservation Time"}: ${formattedRsvpTime}`;

						finalOrderId = await createRsvpStoreOrder({
							tx,
							storeId,
							customerId,
							orderTotal: totalCost,
							currency: store.defaultCurrency || "twd",
							paymentMethodPayUrl: "TBD", // TBD payment method for admin-created orders
							rsvpId: createdRsvp.id, // Pass RSVP ID for pickupCode
							facilityId: facility.id, // Pass facility ID for pickupCode
							facilityName, // Pass facility name for product name
							rsvpTime: createdRsvp.rsvpTime, // Pass RSVP time (BigInt epoch)
							note: orderNote,
							displayToCustomer: false, // Internal note, not displayed to customer
							isPaid: false, // Unpaid order for customer to pay later
						});

						// TODO:notify customer about the unpaid order
					}
				}

				return createdRsvp;
			});

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Rsvp already exists.");
			}

			throw error;
		}
	});
