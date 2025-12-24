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
} from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { createRsvpSchema } from "./create-rsvp.validation";
import { deduceCustomerCredit } from "./deduce-customer-credit";
import { validateReservationTimeWindow } from "@/actions/store/reservation/validate-reservation-time-window";
import { validateRsvpAvailability } from "@/actions/store/reservation/validate-rsvp-availability";

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

		// Fetch store to get timezone, creditServiceExchangeRate, creditExchangeRate, and defaultCurrency
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				defaultTimezone: true,
				creditServiceExchangeRate: true,
				creditExchangeRate: true,
				defaultCurrency: true,
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
				defaultDuration: true,
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

		// Get RSVP settings for time window validation and availability checking
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
			select: {
				canReserveBefore: true,
				canReserveAfter: true,
				singleServiceMode: true,
				defaultDuration: true,
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
						status,
						message: message || null,
						alreadyPaid,
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
				if (
					status === RsvpStatus.Completed &&
					!alreadyPaid &&
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
