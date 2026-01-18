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
import { validateReservationTimeWindow } from "@/actions/store/reservation/validate-reservation-time-window";
import { validateRsvpAvailability } from "@/actions/store/reservation/validate-rsvp-availability";
import { validateServiceStaffBusinessHours } from "@/actions/store/reservation/validate-service-staff-business-hours";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { getT } from "@/app/i18n";

// this is for store admin to update reservation.
// customer can only update rsvp time, number of peopele, and message, for non-completed reservation.
//
export const updateRsvpAction = storeActionClient
	.metadata({ name: "updateRsvp" })
	.schema(updateRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			customerId,
			facilityId,
			serviceStaffId,
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
				facilityId: true,
				serviceStaffId: true,
				rsvpTime: true,
				pricingRuleId: true,
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
		const sessionUserId = session?.user?.id;

		// Since this action uses storeActionClient, the user is already verified as:
		// - System admin (Role.admin), OR
		// - Store member with role: owner, storeAdmin, or staff
		// Therefore, store admins/staff can update everything, including status, even for their own reservations.
		// Customer restrictions only apply to the customer-facing update-reservation.ts action.
		// No need to check for customer restrictions here - all users of this action have admin privileges.

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

		// Validate service staff if provided (optional)
		let serviceStaff: {
			id: string;
			userId: string;
			userName: string | null;
			userEmail: string | null;
			businessHours: string | null;
		} | null = null;

		if (serviceStaffId) {
			const serviceStaffResult = await sqlClient.serviceStaff.findFirst({
				where: {
					id: serviceStaffId,
					storeId,
					isDeleted: false,
				},
				select: {
					id: true,
					userId: true,
					businessHours: true,
					User: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			if (!serviceStaffResult) {
				throw new SafeError("Service staff not found");
			}

			serviceStaff = {
				id: serviceStaffResult.id,
				userId: serviceStaffResult.userId,
				userName: serviceStaffResult.User.name,
				userEmail: serviceStaffResult.User.email,
				businessHours: serviceStaffResult.businessHours,
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

		// Validate service staff business hours if service staff is provided
		// Only validate if rsvpTime changed or serviceStaffId changed
		if (serviceStaffId && serviceStaff) {
			const serviceStaffChanged = rsvp.serviceStaffId !== serviceStaffId;

			if (timeChanged || serviceStaffChanged) {
				await validateServiceStaffBusinessHours(
					serviceStaff.businessHours,
					rsvpTimeUtc,
					storeTimezone,
					serviceStaffId,
				);
			}
		}

		// Get RSVP settings for time window validation, availability checking, and prepaid payment

		// Get RSVP settings for time window validation, availability checking, and prepaid payment
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
			select: {
				canReserveBefore: true,
				canReserveAfter: true,
				singleServiceMode: true,
				defaultDuration: true,
				minPrepaidPercentage: true,
				mustSelectFacility: true,
				mustHaveServiceStaff: true,
			},
		});

		// Validate facility is required when mustSelectFacility is true
		// Check if any facilities exist for this store before requiring selection
		if (rsvpSettings?.mustSelectFacility && !facilityId) {
			const facilitiesCount = await sqlClient.storeFacility.count({
				where: { storeId },
			});
			if (facilitiesCount > 0) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_facility_required") || "Facility is required",
				);
			}
		}

		// Validate service staff is required when mustHaveServiceStaff is true
		// Check if any service staff exist for this store before requiring selection
		if (rsvpSettings?.mustHaveServiceStaff && !serviceStaffId) {
			const serviceStaffCount = await sqlClient.serviceStaff.count({
				where: { storeId, isDeleted: false },
			});
			if (serviceStaffCount > 0) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_service_staff_required") || "Service staff is required",
				);
			}
		}

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		// Note: Store admin can still update reservations, but we validate to ensure consistency
		validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Check if rsvpTime changed
		const timeChanged = !rsvp.rsvpTime || rsvp.rsvpTime !== rsvpTime;

		// Validate availability only if facility is provided and time changed
		if (facilityId && facility && timeChanged) {
			await validateRsvpAvailability(
				storeId,
				rsvpSettings,
				rsvpTime,
				facilityId,
				facility.defaultDuration ?? rsvpSettings?.defaultDuration ?? 60,
				id, // Exclude current reservation from conflict check
			);
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

		// Prepaid payment should have been processed during RSVP creation, not during update
		// Use the provided values directly
		const finalStatus = status;
		const finalAlreadyPaid = alreadyPaid;
		const finalOrderId = rsvp.orderId;

		try {
			const updated = await sqlClient.$transaction(async (tx) => {
				const updatedRsvp = await tx.rsvp.update({
					where: { id },
					data: {
						customerId: customerId || null,
						facilityId: facilityId || null,
						serviceStaffId: serviceStaffId || null,
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

				// Credit deduction should be handled by complete-rsvp action, not during update
				// If status is being changed to Completed, use the dedicated complete-rsvp action instead

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
