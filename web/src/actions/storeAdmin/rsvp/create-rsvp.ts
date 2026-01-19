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
import { validateServiceStaffBusinessHours } from "@/actions/store/reservation/validate-service-staff-business-hours";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { ensureCustomerIsStoreMember } from "@/utils/store-member-utils";
import { MemberRole } from "@/types/enum";

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
			serviceStaffId: rawServiceStaffId,
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

		// Normalize serviceStaffId: convert empty string to null
		const serviceStaffId =
			rawServiceStaffId && rawServiceStaffId.trim() !== ""
				? rawServiceStaffId.trim()
				: null;

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
			facilityName: string;
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
					facilityName: true,
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
				facilityName: facilityResult.facilityName,
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
			defaultCost: number | null;
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
					defaultCost: true,
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

			// Convert Decimal to number for type compatibility
			const defaultCost = serviceStaffResult.defaultCost
				? Number(serviceStaffResult.defaultCost)
				: null;

			// Validate that service staff has a positive cost
			// Service staff line items require positive cost to avoid invalid order items
			if (!defaultCost || defaultCost <= 0) {
				throw new SafeError(
					"Service staff must have a positive cost configured",
				);
			}

			serviceStaff = {
				id: serviceStaffResult.id,
				userId: serviceStaffResult.userId,
				userName: serviceStaffResult.User.name,
				userEmail: serviceStaffResult.User.email,
				defaultCost,
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
		if (serviceStaffId && serviceStaff) {
			await validateServiceStaffBusinessHours(
				serviceStaff.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				serviceStaffId,
			);
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
		// Note: Store admin can still create reservations, but we validate to ensure consistency
		validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Validate availability based on singleServiceMode (only if facility is provided)
		if (facilityId && facility) {
			await validateRsvpAvailability(
				storeId,
				rsvpSettings,
				rsvpTime,
				facilityId,
				facility.defaultDuration ?? rsvpSettings?.defaultDuration ?? 60,
			);
		}

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

		// Calculate facility cost: use facilityCost if provided, otherwise use facility.defaultCost (if facility exists)
		const calculatedFacilityCost =
			facilityCost !== null && facilityCost !== undefined
				? facilityCost
				: facility?.defaultCost
					? Number(facility.defaultCost)
					: null;

		// Calculate service staff cost: use serviceStaff.defaultCost (if service staff exists)
		const calculatedServiceStaffCost = serviceStaff?.defaultCost
			? Number(serviceStaff.defaultCost)
			: null;

		// Validate: If service staff cost exists, serviceStaffId must be present
		if (
			calculatedServiceStaffCost &&
			calculatedServiceStaffCost > 0 &&
			!serviceStaffId
		) {
			throw new SafeError(
				"Service staff ID is required when service staff cost is present",
			);
		}

		// Calculate total cost: facility cost + service staff cost
		const totalCost =
			(calculatedFacilityCost ?? 0) + (calculatedServiceStaffCost ?? 0);

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
						facilityId: facilityId || null,
						serviceStaffId: serviceStaffId,
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
							calculatedFacilityCost !== null &&
							calculatedFacilityCost !== undefined
								? calculatedFacilityCost
								: null,
						serviceStaffCost:
							calculatedServiceStaffCost !== null &&
							calculatedServiceStaffCost !== undefined
								? calculatedServiceStaffCost
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

				// Ensure customer becomes a store member if customerId is provided
				if (customerId) {
					await ensureCustomerIsStoreMember(
						storeId,
						customerId,
						MemberRole.customer,
						tx,
					);
				}

				// If status is Completed, not alreadyPaid, and has customerId, deduct customer's credit
				// Note: This is for service credit usage (after service completion), not prepaid payment
				// Only process if facility exists (credit deduction requires facility)
				if (
					finalStatus === RsvpStatus.Completed &&
					!finalAlreadyPaid &&
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
					if (customerId && totalCost > 0) {
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
						const facilityName = facility?.facilityName || null;

						const serviceStaffName =
							serviceStaff?.userName || serviceStaff?.userEmail || null;

						// Build order note with facility and service staff information
						let orderNote = `${baseNote}\n${t("rsvp_id") || "RSVP ID"}: ${createdRsvp.id}`;
						if (facilityName) {
							orderNote += `\n${t("facility_name") || "Facility"}: ${facilityName}`;
						}
						if (serviceStaffName) {
							orderNote += `\n${t("Service_Staff") || "Service Staff"}: ${serviceStaffName}`;
						}
						orderNote += `\n${t("rsvp_time") || "Reservation Time"}: ${formattedRsvpTime}`;

						// Calculate order amounts (similar to customer-created RSVPs)
						const facilityCostForOrder =
							calculatedFacilityCost !== null && calculatedFacilityCost > 0
								? calculatedFacilityCost
								: null;
						const serviceStaffCostForOrder =
							calculatedServiceStaffCost !== null &&
							calculatedServiceStaffCost > 0
								? calculatedServiceStaffCost
								: null;

						// Determine product name (prefer facility name, fallback to service staff name, then default)
						const productNameForOrder =
							facilityName ||
							serviceStaffName ||
							t("facility_name") ||
							"Reservation";

						finalOrderId = await createRsvpStoreOrder({
							tx,
							storeId,
							customerId,
							facilityCost: facilityCostForOrder,
							serviceStaffCost: serviceStaffCostForOrder,
							currency: store.defaultCurrency || "twd",
							paymentMethodPayUrl: "TBD", // TBD payment method for admin-created orders
							rsvpId: createdRsvp.id, // Pass RSVP ID for pickupCode
							facilityId: facility?.id || null, // Pass facility ID for pickupCode (optional)
							productName: productNameForOrder, // Pass facility or service staff name for product name
							serviceStaffId: serviceStaffId, // Service staff ID if provided
							serviceStaffName, // Service staff name if provided
							rsvpTime: createdRsvp.rsvpTime, // Pass RSVP time (BigInt epoch)
							note: orderNote,
							displayToCustomer: false, // Internal note, not displayed to customer
							isPaid: false, // Unpaid order for customer to pay later
						});
					}
				}

				return createdRsvp;
			});

			// Send notification for unpaid order if an order was created
			if (finalOrderId && customerId) {
				// Fetch RSVP with relations for notification
				const rsvpForNotification = await sqlClient.rsvp.findUnique({
					where: { id: rsvp.id },
					include: {
						Store: {
							select: {
								id: true,
								name: true,
								ownerId: true,
							},
						},
						Customer: {
							select: {
								id: true,
								name: true,
								email: true,
								phoneNumber: true,
							},
						},
						Facility: {
							select: {
								facilityName: true,
							},
						},
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
						Order: {
							select: {
								id: true,
							},
						},
					},
				});

				if (rsvpForNotification && rsvpForNotification.Order) {
					const notificationRouter = getRsvpNotificationRouter();
					// Build payment URL - link to checkout page for the order
					const paymentUrl = `/checkout/${finalOrderId}`;

					await notificationRouter.routeNotification({
						rsvpId: rsvpForNotification.id,
						storeId: rsvpForNotification.storeId,
						eventType: "unpaid_order_created",
						customerId: rsvpForNotification.customerId,
						customerName:
							rsvpForNotification.Customer?.name ||
							rsvpForNotification.name ||
							null,
						customerEmail: rsvpForNotification.Customer?.email || null,
						customerPhone:
							rsvpForNotification.Customer?.phoneNumber ||
							rsvpForNotification.phone ||
							null,
						storeName: rsvpForNotification.Store?.name || null,
						storeOwnerId: rsvpForNotification.Store?.ownerId || null,
						rsvpTime: rsvpForNotification.rsvpTime,
						status: rsvpForNotification.status,
						facilityName:
							rsvpForNotification.Facility?.facilityName ||
							facility?.facilityName ||
							null,
						serviceStaffName:
							rsvpForNotification.ServiceStaff?.User?.name ||
							rsvpForNotification.ServiceStaff?.User?.email ||
							null,
						numOfAdult: rsvpForNotification.numOfAdult,
						numOfChild: rsvpForNotification.numOfChild,
						message: rsvpForNotification.message || null,
						actionUrl: paymentUrl,
					});
				}
			}

			// Fetch RSVP with all relations for notification
			const rsvpWithRelations = await sqlClient.rsvp.findUnique({
				where: { id: rsvp.id },
				include: {
					Store: true,
					Customer: true,
					Facility: true,
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

			// Send notification for reservation creation
			if (rsvpWithRelations) {
				const notificationRouter = getRsvpNotificationRouter();
				await notificationRouter.routeNotification({
					rsvpId: rsvpWithRelations.id,
					storeId: rsvpWithRelations.storeId,
					eventType: "created",
					customerId: rsvpWithRelations.customerId,
					customerName:
						rsvpWithRelations.Customer?.name || rsvpWithRelations.name || null,
					customerEmail: rsvpWithRelations.Customer?.email || null,
					customerPhone:
						rsvpWithRelations.Customer?.phoneNumber ||
						rsvpWithRelations.phone ||
						null,
					storeName: rsvpWithRelations.Store?.name || null,
					rsvpTime: rsvpWithRelations.rsvpTime,
					status: rsvpWithRelations.status,
					facilityName:
						rsvpWithRelations.Facility?.facilityName ||
						facility?.facilityName ||
						null,
					serviceStaffName:
						rsvpWithRelations.ServiceStaff?.User?.name ||
						rsvpWithRelations.ServiceStaff?.User?.email ||
						null,
					numOfAdult: rsvpWithRelations.numOfAdult,
					numOfChild: rsvpWithRelations.numOfChild,
					message: rsvpWithRelations.message || null,
					actionUrl: `/storeAdmin/${rsvpWithRelations.storeId}/rsvp`,
				});
			}

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
