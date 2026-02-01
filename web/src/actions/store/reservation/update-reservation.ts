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
import { getT } from "@/app/i18n";

// implement FR-RSVP-013
// this is for store admin to update reservation.
// customer can only update rsvp time, number of peopele, and message, for non-completed reservation.
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
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_reservation_not_found") || "Reservation not found",
			);
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
			const { t } = await getT();
			throw new SafeError(
				error instanceof Error
					? error.message
					: t("rsvp_failed_convert_rsvp_time_utc") ||
							"Failed to convert rsvpTime to UTC",
			);
		}

		const rsvpTime = dateToEpoch(rsvpTimeUtc);
		if (!rsvpTime) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_failed_convert_rsvp_time_epoch") ||
					"Failed to convert rsvpTime to epoch",
			);
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
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_no_permission_to_edit") ||
					"You do not have permission to edit this reservation",
			);
		}

		// Customer restrictions: customers can only update rsvp time, number of people, and message, for non-completed reservation.
		const { t } = await getT();

		// Prevent updates to completed reservations
		if (existingRsvp.status === RsvpStatus.Completed) {
			throw new SafeError(
				t("rsvp_completed_reservation_cannot_update") ||
					"Completed reservations cannot be updated",
			);
		}

		// Only allow customers to update: rsvpTime, numOfAdult, numOfChild, message
		// Prevent updates to facilityId and serviceStaffId
		if (facilityId !== undefined) {
			const existingFacilityId = existingRsvp.facilityId || null;
			const normalizedFacilityId = facilityId || null; // Treat empty string as null
			if (normalizedFacilityId !== existingFacilityId) {
				throw new SafeError(
					t("rsvp_customer_cannot_update_facility") ||
						"Customers cannot update facility",
				);
			}
		}
		if (serviceStaffId !== undefined) {
			const existingServiceStaffId = existingRsvp.serviceStaffId || null;
			const normalizedServiceStaffId = serviceStaffId || null; // Treat empty string as null
			if (normalizedServiceStaffId !== existingServiceStaffId) {
				throw new SafeError(
					t("rsvp_customer_cannot_update_service_staff") ||
						"Customers cannot update service staff",
				);
			}
		}

		// Set createdBy if it's currently null (for old records)
		const createdBy = sessionUserId || existingRsvp.createdBy || null;

		// Note: We don't validate mustSelectFacility or mustHaveServiceStaff here
		// because customers cannot change facilityId or serviceStaffId anyway
		// The existing values from the reservation will be preserved

		// Use existing facilityId and serviceStaffId (customers cannot change them)
		const finalFacilityId = existingRsvp.facilityId;
		const finalServiceStaffId = existingRsvp.serviceStaffId;

		// Get service staff using existing value (not input value)
		let serviceStaff = null;
		if (finalServiceStaffId) {
			const serviceStaffResult = await sqlClient.serviceStaff.findFirst({
				where: {
					id: finalServiceStaffId,
					storeId: existingRsvp.storeId,
					isDeleted: false,
				},
				select: {
					id: true,
					defaultCost: true,
					defaultCredit: true,
				},
			});

			if (serviceStaffResult) {
				serviceStaff = {
					id: serviceStaffResult.id,
					defaultCost: serviceStaffResult.defaultCost
						? Number(serviceStaffResult.defaultCost)
						: null,
					defaultCredit: serviceStaffResult.defaultCredit
						? Number(serviceStaffResult.defaultCredit)
						: null,
				};

				// Validate service staff business hours (now resolves from ServiceStaffFacilitySchedule)
				await validateServiceStaffBusinessHours(
					existingRsvp.storeId,
					finalServiceStaffId,
					finalFacilityId || null,
					rsvpTimeUtc,
					storeTimezone,
				);
			}
		}

		// Get facility using existing value (not input value)
		let facility: {
			id: string;
			storeId: string;
			facilityName: string;
			defaultDuration: number | null;
			defaultCost: number | null;
			defaultCredit: number | null;
			businessHours: string | null;
		} | null = null;

		if (finalFacilityId) {
			const facilityResult = await sqlClient.storeFacility.findFirst({
				where: {
					id: finalFacilityId,
					storeId: existingRsvp.storeId,
				},
				select: {
					id: true,
					storeId: true,
					facilityName: true,
					defaultDuration: true,
					defaultCost: true,
					defaultCredit: true,
					businessHours: true,
				},
			});

			if (facilityResult) {
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
		}

		// Validate cancelHours window (FR-RSVP-013)
		await validateCancelHoursWindow(rsvpSettingsResult, rsvpTime, "modify");

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		await validateReservationTimeWindow(rsvpSettingsResult, rsvpTime);

		// Validate business hours (if facility has business hours) - only if facility exists
		if (facility) {
			await validateFacilityBusinessHours(
				facility.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				finalFacilityId!,
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
				finalFacilityId!,
				facility.defaultDuration ?? rsvpSettingsResult?.defaultDuration ?? 60,
				id, // Exclude current reservation from conflict check
			);
		}

		// Do not update costs/credits - these should remain as set during creation
		// Customers can only update: rsvpTime, numOfAdult, numOfChild, message

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					// Do not update facilityId or serviceStaffId - customers cannot change them
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
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_update_failed") || "Reservation update failed.",
				);
			}

			throw error;
		}
	});
