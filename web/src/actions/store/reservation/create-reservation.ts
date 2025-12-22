"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	dateToEpoch,
	getUtcNowEpoch,
	convertDateToUtc,
} from "@/utils/datetime-utils";

import { createReservationSchema } from "./create-reservation.validation";
import { RsvpStatus } from "@/types/enum";
import { processRsvpPrepaidPayment } from "./process-rsvp-prepaid-payment";
import { validateFacilityBusinessHours } from "./validate-facility-business-hours";
import { validateReservationTimeWindow } from "./validate-reservation-time-window";

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

		// Process prepaid payment using shared function
		const prepaidResult = await processRsvpPrepaidPayment({
			storeId,
			customerId: finalCustomerId,
			prepaidRequired: rsvpSettings?.prepaidRequired ?? false,
			minPrepaidAmount: rsvpSettings?.minPrepaidAmount
				? Number(rsvpSettings.minPrepaidAmount)
				: null,
			rsvpTime,
			store: {
				useCustomerCredit: store.useCustomerCredit,
				creditExchangeRate: store.creditExchangeRate
					? Number(store.creditExchangeRate)
					: null,
				defaultCurrency: store.defaultCurrency,
				defaultTimezone: store.defaultTimezone,
			},
		});

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
					status: prepaidResult.status,
					alreadyPaid: prepaidResult.alreadyPaid,
					orderId: prepaidResult.orderId,
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

			// Check if prepaid is required and user needs to recharge
			const requiresPrepaid = rsvpSettings?.prepaidRequired ?? false;
			const needsRecharge = requiresPrepaid && !transformedRsvp.alreadyPaid;

			return {
				rsvp: transformedRsvp,
				requiresPrepaid: needsRecharge,
				// If prepaid is required and user is anonymous, they need to sign in first
				requiresSignIn: needsRecharge && isAnonymous,
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
