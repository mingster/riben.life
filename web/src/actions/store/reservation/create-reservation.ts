"use server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import type { Rsvp } from "@/types";
import { baseClient } from "@/utils/actions/safe-action";
import {
	convertDateToUtc,
	dateToEpoch,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { createReservationSchema } from "./create-reservation.validation";
import { validateFacilityBusinessHours } from "./validate-facility-business-hours";
import { validateReservationTimeWindow } from "./validate-reservation-time-window";
import { validateRsvpAvailability } from "./validate-rsvp-availability";
import { createRsvpStoreOrder } from "./create-rsvp-store-order";
import { RsvpStatus } from "@/types/enum";
import { getT } from "@/app/i18n";

// create a reservation by the customer.
// this action will create a reservation record, store order, and related ledger records in the database,
// and process the prepaid payment if required.
export const createReservationAction = baseClient
	.metadata({ name: "createReservation" })
	.schema(createReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			customerId,
			email,
			phone,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			message,
		} = parsedInput;

		// Get session to check if user is logged in
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const sessionUserId = session?.user?.id;

		// Get store and RSVP settings
		const [store, rsvpSettings] = await Promise.all([
			sqlClient.store.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					name: true,
					useBusinessHours: true,
					defaultTimezone: true,
					useCustomerCredit: true,
					creditExchangeRate: true,
					defaultCurrency: true,
				},
			}),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId },
			}),
		]);

		if (!store) {
			throw new SafeError("Store not found");
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			throw new SafeError("Reservations are not currently accepted");
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

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Check if user is anonymous (not logged in and no customerId provided)
		const isAnonymous = !sessionUserId && !customerId;

		// Validate email and phone requirements for anonymous users
		if (isAnonymous) {
			// Anonymous user - email and phone are required
			if (!email) {
				throw new SafeError("Email is required for anonymous reservations");
			}
			if (!phone) {
				throw new SafeError(
					"Phone number is required for anonymous reservations",
				);
			}
		}

		// Use session userId if available, otherwise use provided customerId
		const finalCustomerId = sessionUserId || customerId || null;

		// Get current user ID for createdBy field (if logged in)
		const createdBy = sessionUserId || null;

		// Check if user is blacklisted (only for logged-in users)
		if (finalCustomerId) {
			const isBlacklisted = await sqlClient.rsvpBlacklist.findFirst({
				where: {
					storeId,
					userId: finalCustomerId,
				},
			});

			if (isBlacklisted) {
				throw new SafeError("You are not allowed to create reservations");
			}
		}

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
				businessHours: true,
				defaultCost: true,
				defaultDuration: true,
			},
		});

		if (!facility) {
			throw new SafeError("Facility not found");
		}

		// Validate business hours (if facility has business hours)
		validateFacilityBusinessHours(
			facility.businessHours,
			rsvpTimeUtc,
			storeTimezone,
			facilityId,
		);

		// Validate availability based on singleServiceMode
		await validateRsvpAvailability(
			storeId,
			rsvpSettings,
			rsvpTime,
			facilityId,
			facility.defaultDuration, // Use facility duration if available
		);

		// Check if prepaid is required
		const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
		const totalCost = facility?.defaultCost
			? Number(facility.defaultCost)
			: null;

		const prepaidRequired =
			minPrepaidPercentage > 0 && totalCost !== null && totalCost > 0;
		const requiredPrepaid = prepaidRequired
			? Math.ceil(totalCost * (minPrepaidPercentage / 100))
			: null;

		// Determine RSVP status and payment status
		let rsvpStatus = prepaidRequired
			? Number(RsvpStatus.Pending)
			: Number(RsvpStatus.ReadyToConfirm);
		let alreadyPaid = false;
		let orderId: string | null = null;

		// If prepaid is required and customer is signed in, create order for checkout
		if (
			prepaidRequired &&
			requiredPrepaid !== null &&
			requiredPrepaid > 0 &&
			finalCustomerId
		) {
			// Get translation function for order note
			const { t } = await getT();

			// Determine payment method based on store settings
			const paymentMethodPayUrl = store.useCustomerCredit ? "credit" : "TBD";

			// Create unpaid order in transaction (customer will pay at checkout)
			await sqlClient.$transaction(async (tx) => {
				orderId = await createRsvpStoreOrder({
					tx,
					storeId,
					customerId: finalCustomerId, // finalCustomerId is guaranteed to be non-null here
					orderTotal: requiredPrepaid,
					currency: store.defaultCurrency || "twd",
					paymentMethodPayUrl, // "credit" if useCustomerCredit=true, "TBD" otherwise
					note:
						t("rsvp_reservation_payment_note") || "RSVP reservation payment",
					isPaid: false, // Customer will pay at checkout
				});
			});
		}

		try {
			const rsvp = await sqlClient.rsvp.create({
				data: {
					storeId,
					customerId: finalCustomerId,
					facilityId,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
					// Store email and phone for anonymous reservations
					email: finalCustomerId ? null : email || null, // Only store if anonymous
					phone: finalCustomerId ? null : phone || null, // Only store if anonymous
					status: rsvpStatus,
					alreadyPaid,
					orderId,
					confirmedByStore: false,
					confirmedByCustomer: false,
					createdBy,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Facility: true,
					Order: true,
				},
			});

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
				orderId, // Return orderId so frontend can redirect to checkout
				// If prepaid is required and user is anonymous, they need to sign in first
				requiresSignIn: prepaidRequired && isAnonymous,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation already exists.");
			}

			throw error;
		}
	});
