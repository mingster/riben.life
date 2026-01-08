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
	convertDateToUtc,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";

import { updateReservationSchema } from "./update-reservation.validation";
import { validateFacilityBusinessHours } from "./validate-facility-business-hours";
import { validateServiceStaffBusinessHours } from "./validate-service-staff-business-hours";
import { validateCancelHoursWindow } from "./validate-cancel-hours";
import { validateReservationTimeWindow } from "./validate-reservation-time-window";
import { validateRsvpAvailability } from "./validate-rsvp-availability";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { RsvpStatus } from "@/types/enum";

// implement FR-RSVP-013
//
export const updateReservationAction = baseClient
	.metadata({ name: "updateReservation" })
	.schema(updateReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			id,
			facilityId,
			serviceStaffId, // Added serviceStaffId
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
		const sessionUserEmail = session?.user?.email;

		// Get the existing RSVP
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: {
					select: {
						id: true,
						name: true,
						defaultTimezone: true,
						useBusinessHours: true,
					},
				},
			},
		});

		if (!existingRsvp) {
			throw new SafeError("Reservation not found");
		}

		const storeId = existingRsvp.storeId;
		const storeTimezone = existingRsvp.Store?.defaultTimezone || "Asia/Taipei";

		// Fetch RsvpSettings for validations
		const rsvpSettingsResult = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
			select: {
				cancelHours: true,
				canCancel: true,
				defaultDuration: true,
				canReserveBefore: true,
				canReserveAfter: true,
				singleServiceMode: true,
				mustSelectFacility: true, // Added mustSelectFacility
				mustHaveServiceStaff: true, // Added mustHaveServiceStaff
			},
		});

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

		// Verify ownership: user must be logged in and match customerId, or match by email
		// For anonymous users, allow editing if status is Pending/ReadyToConfirm
		// The client-side canEditReservation already verified ownership via isUserReservation
		// which checks if the reservation is in local storage for anonymous users
		let hasPermission = false;

		// Check if user is logged in and matches customerId or email
		if (sessionUserId && existingRsvp.customerId) {
			hasPermission = existingRsvp.customerId === sessionUserId;
		} else if (sessionUserEmail && existingRsvp.Customer?.email) {
			hasPermission = existingRsvp.Customer.email === sessionUserEmail;
		} else if (!sessionUserId) {
			// Anonymous user: If status is Pending/ReadyToConfirm, allow editing
			// The client-side canEditReservation already verified ownership via isUserReservation
			// which checks if the reservation is in local storage for anonymous users
			if (
				existingRsvp.status === RsvpStatus.Pending ||
				existingRsvp.status === RsvpStatus.ReadyToConfirm
			) {
				hasPermission = true;
			}
		}

		if (!hasPermission) {
			throw new SafeError(
				"You do not have permission to edit this reservation",
			);
		}

		// Set createdBy if it's currently null (for old records)
		const createdBy = sessionUserId || existingRsvp.createdBy || null;

		// Validate facilityId if mustSelectFacility is true
		if (rsvpSettingsResult?.mustSelectFacility && !facilityId) {
			throw new SafeError("Facility is required");
		}

		// Validate serviceStaffId if mustHaveServiceStaff is true
		if (rsvpSettingsResult?.mustHaveServiceStaff && !serviceStaffId) {
			throw new SafeError("Service staff is required");
		}

		// Get service staff if provided
		let serviceStaff = null;
		if (serviceStaffId) {
			serviceStaff = await sqlClient.serviceStaff.findFirst({
				where: {
					id: serviceStaffId,
					storeId: existingRsvp.storeId,
					isDeleted: false,
				},
				select: {
					id: true,
					businessHours: true,
					defaultCost: true,
					defaultCredit: true,
				},
			});

			if (!serviceStaff) {
				throw new SafeError("Service staff not found");
			}

			// Validate service staff business hours
			validateServiceStaffBusinessHours(
				serviceStaff.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				serviceStaffId,
			);
		}

		// Validate facility if provided (optional)
		let facility: {
			id: string;
			storeId: string;
			facilityName: string;
			defaultDuration: number | null;
			defaultCost: number | null;
			defaultCredit: number | null;
			businessHours: string | null;
		} | null = null;

		if (facilityId) {
			const facilityResult = await sqlClient.storeFacility.findFirst({
				where: {
					id: facilityId,
					storeId: existingRsvp.storeId,
				},
				select: {
					id: true,
					storeId: true,
					facilityName: true,
					defaultDuration: true,
					defaultCost: true, // Added defaultCost
					defaultCredit: true, // Added defaultCredit
					businessHours: true,
				},
			});

			if (!facilityResult) {
				throw new SafeError("Facility not found");
			}

			// Convert Decimal to number for type compatibility
			facility = {
				id: facilityResult.id,
				storeId: facilityResult.storeId,
				facilityName: facilityResult.facilityName,
				defaultDuration: facilityResult.defaultDuration
					? Number(facilityResult.defaultDuration)
					: null,
				defaultCost: facilityResult.defaultCost
					? Number(facilityResult.defaultCost)
					: null,
				defaultCredit: facilityResult.defaultCredit
					? Number(facilityResult.defaultCredit)
					: null,
				businessHours: facilityResult.businessHours,
			};
		}

		// Validate cancelHours window (FR-RSVP-013)
		validateCancelHoursWindow(rsvpSettingsResult, rsvpTime, "modify");

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		validateReservationTimeWindow(rsvpSettingsResult, rsvpTime);

		// Validate business hours (if facility has business hours) - only if facility exists
		if (facility) {
			validateFacilityBusinessHours(
				facility.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				facilityId!,
			);
		}

		// Validate availability based on singleServiceMode (BR-RSVP-004)
		// Check if rsvpTime is different from existing reservation
		// Only validate if facility exists
		const existingRsvpTime = existingRsvp.rsvpTime;
		if (facility && existingRsvpTime !== rsvpTime) {
			// Time changed, validate availability
			await validateRsvpAvailability(
				existingRsvp.storeId,
				rsvpSettingsResult,
				rsvpTime,
				facilityId!,
				facility.defaultDuration ?? rsvpSettingsResult?.defaultDuration ?? 60,
				id, // Exclude current reservation from conflict check
			);
		}

		// Calculate costs: facility cost + service staff cost (if applicable)
		let facilityCost = facility?.defaultCost ? Number(facility.defaultCost) : 0;
		let facilityCredit = facility?.defaultCredit
			? Number(facility.defaultCredit)
			: 0;
		let serviceStaffCost = serviceStaff?.defaultCost
			? Number(serviceStaff.defaultCost)
			: 0;
		let serviceStaffCredit = serviceStaff?.defaultCredit
			? Number(serviceStaff.defaultCredit)
			: 0;

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					facilityId: facilityId || null,
					facilityCost:
						facilityCost > 0 ? new Prisma.Decimal(facilityCost) : null,
					facilityCredit:
						facilityCredit > 0 ? new Prisma.Decimal(facilityCredit) : null,
					pricingRuleId: null, // Pricing rules are not used in this simple reservation flow
					serviceStaffId: serviceStaffId || null,
					serviceStaffCost:
						serviceStaffCost > 0 ? new Prisma.Decimal(serviceStaffCost) : null,
					serviceStaffCredit:
						serviceStaffCredit > 0
							? new Prisma.Decimal(serviceStaffCredit)
							: null,
					numOfAdult,
					numOfChild,
					rsvpTime,
					message: message || null,
					confirmedByStore: false, // Reset confirmation when reservation is modified
					createdBy: createdBy || undefined, // Only update if we have a value
					updatedAt: getUtcNowEpoch(), // Update timestamp
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Facility: true,
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			// Send notification for reservation update
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: updated.id,
				storeId: updated.storeId,
				eventType: "updated",
				customerId: updated.customerId,
				customerName: updated.Customer?.name || updated.name || null,
				customerEmail: updated.Customer?.email || null,
				customerPhone: updated.Customer?.phoneNumber || updated.phone || null,
				storeName: updated.Store?.name || null,
				rsvpTime: updated.rsvpTime,
				status: updated.status,
				facilityName: updated.Facility?.facilityName || null,
				numOfAdult: updated.numOfAdult,
				numOfChild: updated.numOfChild,
				message: updated.message || null,
				actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
			});

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Reservation update failed.");
			}

			throw error;
		}
	});
