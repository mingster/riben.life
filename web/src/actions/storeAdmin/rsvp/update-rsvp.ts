"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	getUtcNowEpoch,
	dateToEpoch,
	convertDateToUtc,
} from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateRsvpSchema } from "./update-rsvp.validation";
import { deduceCustomerCredit } from "./deduce-customer-credit";
import { validateReservationTimeWindow } from "@/actions/store/reservation/validate-reservation-time-window";
import { validateRsvpAvailability } from "@/actions/store/reservation/validate-rsvp-availability";
import { processRsvpPrepaidPaymentUsingCredit } from "@/actions/store/reservation/process-rsvp-prepaid-payment-using-credit";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";

export const updateRsvpAction = storeActionClient
	.metadata({ name: "updateRsvp" })
	.schema(updateRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
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

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: {
				id: true,
				storeId: true,
				createdBy: true,
				status: true,
				alreadyPaid: true,
				confirmedByStore: true,
				customerId: true,
				orderId: true,
			},
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		const wasCompleted = rsvp.status === RsvpStatus.Completed;
		const previousStatus = rsvp.status;
		const previousAlreadyPaid = rsvp.alreadyPaid;
		const previousConfirmedByStore = rsvp.confirmedByStore;

		// Get current user ID for createdBy field (only set if currently null)
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const createdBy = session?.user?.id || rsvp.createdBy || null;

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

		// Validate facility if provided (optional)
		let facility: {
			id: string;
			defaultDuration: number | null;
			defaultCost: number | null;
		} | null = null;

		if (facilityId) {
			const facilityResult = await sqlClient.storeFacility.findFirst({
				where: {
					id: facilityId,
					storeId,
				},
				select: {
					id: true,
					defaultDuration: true,
					defaultCost: true,
				},
			});

			if (!facilityResult) {
				throw new SafeError("Facility not found");
			}

			// Convert Decimal to number for type compatibility
			facility = {
				id: facilityResult.id,
				defaultDuration: facilityResult.defaultDuration
					? Number(facilityResult.defaultDuration)
					: null,
				defaultCost: facilityResult.defaultCost
					? Number(facilityResult.defaultCost)
					: null,
			};
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
		// Note: Store admin can still update reservations, but we validate to ensure consistency
		validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Validate availability based on singleServiceMode (only if rsvpTime changed)
		// Check if rsvpTime is different from existing reservation
		const existingRsvpTime = await sqlClient.rsvp.findUnique({
			where: { id },
			select: { rsvpTime: true },
		});

		// Validate availability only if facility is provided and time changed
		if (facilityId && facility) {
			if (existingRsvpTime && existingRsvpTime.rsvpTime !== rsvpTime) {
				// Time changed, validate availability
				await validateRsvpAvailability(
					storeId,
					rsvpSettings,
					rsvpTime,
					facilityId,
					facility.defaultDuration ?? rsvpSettings?.defaultDuration ?? 60,
					id, // Exclude current reservation from conflict check
				);
			} else if (!existingRsvpTime) {
				// New reservation or time definitely changed
				await validateRsvpAvailability(
					storeId,
					rsvpSettings,
					rsvpTime,
					facilityId,
					facility.defaultDuration ?? rsvpSettings?.defaultDuration ?? 60,
					id, // Exclude current reservation from conflict check
				);
			}
		}

		// Convert arriveTime to UTC Date, then to BigInt epoch (or null)
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

		// Calculate total cost: use facilityCost if provided, otherwise use facility.defaultCost (if facility exists)
		const totalCost =
			facilityCost !== null && facilityCost !== undefined
				? facilityCost
				: facility?.defaultCost
					? Number(facility.defaultCost)
					: null;

		// Process prepaid payment if:
		// 1. customerId is provided
		// 2. No existing orderId (to avoid creating duplicate orders)
		// 3. Store uses customer credit
		const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
		let prepaidResult: {
			status: number;
			alreadyPaid: boolean;
			orderId: string | null;
		} = {
			status,
			alreadyPaid,
			orderId: rsvp.orderId, // Keep existing orderId if it exists
		};

		// Only process prepaid payment if customerId is provided, no existing order, and store uses credit
		if (
			customerId &&
			!rsvp.orderId &&
			store.useCustomerCredit === true &&
			facility
		) {
			prepaidResult = await processRsvpPrepaidPaymentUsingCredit({
				storeId,
				customerId,
				minPrepaidPercentage,
				totalCost,
				rsvpTime,
				rsvpId: id, // Pass RSVP ID for pickupCode
				facilityId: facility.id, // Pass facility ID for pickupCode
				store: {
					useCustomerCredit: store.useCustomerCredit,
					creditExchangeRate: store.creditExchangeRate
						? Number(store.creditExchangeRate)
						: null,
					defaultCurrency: store.defaultCurrency,
					defaultTimezone: store.defaultTimezone,
				},
			});
		}

		// Use status and alreadyPaid from prepaid payment processing if it was processed
		// Otherwise, use the provided values
		// Only override if prepaid payment was actually processed (orderId was created)
		const finalStatus = prepaidResult.orderId ? prepaidResult.status : status;
		const finalAlreadyPaid = prepaidResult.orderId
			? prepaidResult.alreadyPaid
			: alreadyPaid;
		const finalOrderId = prepaidResult.orderId || rsvp.orderId;

		try {
			const updated = await sqlClient.$transaction(async (tx) => {
				const updatedRsvp = await tx.rsvp.update({
					where: { id },
					data: {
						customerId: customerId || null,
						facilityId: facilityId || null,
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
						createdBy: createdBy || undefined, // Only update if we have a value
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

				// If status is Completed, not alreadyPaid, and wasn't previously Completed, deduct customer's credit
				// Note: This is for service credit usage (after service completion), not prepaid payment
				// Only process if facility exists (credit deduction requires facility)
				if (
					finalStatus === RsvpStatus.Completed &&
					!finalAlreadyPaid &&
					!wasCompleted &&
					customerId &&
					facility &&
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
						rsvpId: id,
						facilityId: facility.id,
						duration,
						creditServiceExchangeRate,
						creditExchangeRate,
						defaultCurrency,
						createdBy: createdBy || null,
					});
				}

				return updatedRsvp;
			});

			// Determine event type based on what changed
			let eventType:
				| "updated"
				| "status_changed"
				| "confirmed_by_store"
				| "payment_received"
				| "ready"
				| "completed"
				| "no_show" = "updated";

			if (previousStatus !== undefined && previousStatus !== finalStatus) {
				eventType = "status_changed";
				// Check for specific status transitions
				if (finalStatus === RsvpStatus.Ready) {
					eventType = "ready";
				} else if (finalStatus === RsvpStatus.Completed) {
					eventType = "completed";
				} else if (finalStatus === RsvpStatus.NoShow) {
					eventType = "no_show";
				}
			} else if (
				confirmedByStore !== undefined &&
				confirmedByStore &&
				!previousConfirmedByStore
			) {
				eventType = "confirmed_by_store";
			} else if (
				alreadyPaid !== undefined &&
				alreadyPaid &&
				!previousAlreadyPaid
			) {
				eventType = "payment_received";
			}

			// Send notification for reservation update
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: updated.id,
				storeId: updated.storeId,
				eventType,
				customerId: updated.customerId,
				customerName: updated.Customer?.name || updated.name || null,
				customerEmail: updated.Customer?.email || null,
				customerPhone: updated.Customer?.phoneNumber || updated.phone || null,
				storeName: updated.Store?.name || null,
				rsvpTime: updated.rsvpTime,
				arriveTime: updated.arriveTime,
				status: updated.status,
				previousStatus: previousStatus,
				facilityName: updated.Facility?.facilityName || null,
				serviceStaffName:
					updated.ServiceStaff?.User?.name ||
					updated.ServiceStaff?.User?.email ||
					null,
				numOfAdult: updated.numOfAdult,
				numOfChild: updated.numOfChild,
				message: updated.message || null,
				actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
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
				throw new SafeError("Rsvp update failed.");
			}

			throw error;
		}
	});
