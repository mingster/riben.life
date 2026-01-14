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
import { validateServiceStaffBusinessHours } from "./validate-service-staff-business-hours";
import { validateReservationTimeWindow } from "./validate-reservation-time-window";
import { validateRsvpAvailability } from "./validate-rsvp-availability";
import { createRsvpStoreOrder } from "./create-rsvp-store-order";
import { RsvpStatus } from "@/types/enum";
import { getT } from "@/app/i18n";
import { normalizePhoneNumber } from "@/utils/phone-utils";
import logger from "@/lib/logger";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";

// create a reservation by the customer.
// this action will create a reservation record and store order.
// once the order is paid, related ledger records will be created when mark as paid.
//
export const createReservationAction = baseClient
	.metadata({ name: "createReservation" })
	.schema(createReservationSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			customerId,
			name,
			phone,
			facilityId,
			serviceStaffId,
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

		// Check if user is anonymous (no session OR anonymous user with guest-*@riben.life email)
		// Anonymous users created via Better Auth anonymous plugin have emails like guest-{id}@riben.life
		const isAnonymousUser =
			sessionUserEmail &&
			sessionUserEmail.startsWith("guest-") &&
			sessionUserEmail.endsWith("@riben.life");

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
			const { t } = await getT();
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_not_currently_accepted") ||
					"Reservations are not currently accepted",
			);
		}

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

		// Validate reservation time window (canReserveBefore and canReserveAfter)
		await validateReservationTimeWindow(rsvpSettings, rsvpTime);

		// Check if user is anonymous (no session, anonymous user via plugin, or no customerId provided)
		// Anonymous users include:
		// 1. Users with no session (completely anonymous)
		// 2. Users signed in via Better Auth anonymous plugin (guest-*@riben.life emails)
		let isAnonymous = (!sessionUserId || isAnonymousUser) && !customerId;
		let foundCustomerIdByPhone: string | null = null;

		// Validate name and phone requirements for anonymous users
		if (isAnonymous) {
			// Get translation function for error messages
			const { t } = await getT();

			// Anonymous user - name and phone are required
			if (!name) {
				throw new SafeError(t("rsvp_name_and_phone_required_for_anonymous"));
			}
			if (!phone) {
				throw new SafeError(t("rsvp_phone_required_for_anonymous"));
			}

			// Try to locate user from phone number
			try {
				const normalizedPhone = normalizePhoneNumber(phone);
				const userByPhone = await sqlClient.user.findFirst({
					where: {
						phoneNumber: normalizedPhone,
					},
					select: {
						id: true,
						email: true,
						name: true,
					},
				});

				if (userByPhone) {
					// Found existing user with this phone number
					logger.info("Found user by phone number for anonymous reservation", {
						metadata: {
							storeId,
							userId: userByPhone.id,
							phoneNumber: normalizedPhone,
							reservationName: name,
						},
						tags: ["rsvp", "user-lookup", "phone"],
					});

					// Store found user's ID
					foundCustomerIdByPhone = userByPhone.id;
					isAnonymous = false; // No longer anonymous since we found a user
				} else {
					logger.info(
						"No user found by phone number for anonymous reservation",
						{
							metadata: {
								storeId,
								phoneNumber: normalizedPhone,
								reservationName: name,
							},
							tags: ["rsvp", "user-lookup", "phone", "anonymous"],
						},
					);

					// Note: User creation/sign-in should be handled on the client side using authClient
					// Anonymous users should sign in before creating reservations that require payment
				}
			} catch (error) {
				// Log error but don't block reservation creation
				logger.error("Failed to lookup user by phone number", {
					metadata: {
						storeId,
						phone,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "user-lookup", "error"],
				});
			}
		}

		// Use session userId if available, otherwise use provided customerId or found customerId by phone
		const finalCustomerId =
			sessionUserId || customerId || foundCustomerIdByPhone || null;

		// Get current user ID for createdBy field (if logged in or found by phone)
		const createdBy = sessionUserId || foundCustomerIdByPhone || null;

		// Check if user is blacklisted (only for logged-in users)
		if (finalCustomerId) {
			const isBlacklisted = await sqlClient.rsvpBlacklist.findFirst({
				where: {
					storeId,
					userId: finalCustomerId,
				},
			});

			if (isBlacklisted) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_not_allowed_to_create") ||
						"You are not allowed to create reservations",
				);
			}
		}

		// Validate facilityId if mustSelectFacility is true
		if (rsvpSettings?.mustSelectFacility && !facilityId) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_facility_required") || "Facility is required",
			);
		}

		// Validate serviceStaffId if mustHaveServiceStaff is true
		if (rsvpSettings?.mustHaveServiceStaff && !serviceStaffId) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_service_staff_required") || "Service staff is required",
			);
		}

		// Get service staff if provided
		let serviceStaff = null;
		let serviceStaffName: string | null = null;
		if (serviceStaffId) {
			serviceStaff = await sqlClient.serviceStaff.findFirst({
				where: {
					id: serviceStaffId,
					storeId,
					isDeleted: false,
				},
				select: {
					id: true,
					businessHours: true,
					defaultCost: true,
					defaultCredit: true,
					User: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			});

			if (!serviceStaff) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_service_staff_not_found") || "Service staff not found",
				);
			}

			// Get service staff display name (name || email || id)
			serviceStaffName =
				serviceStaff.User?.name || serviceStaff.User?.email || serviceStaffId;

			// Validate service staff business hours
			await validateServiceStaffBusinessHours(
				serviceStaff.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				serviceStaffId,
			);
		}

		// Validate facility if provided (optional)
		let facility: {
			id: string;
			facilityName: string;
			businessHours: string | null;
			defaultCost: number | null;
			defaultCredit: number | null;
			defaultDuration: number | null;
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
					businessHours: true,
					defaultCost: true,
					defaultCredit: true,
					defaultDuration: true,
				},
			});

			if (!facilityResult) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_facility_not_found") || "Facility not found",
				);
			}

			// Convert Decimal to number for type compatibility
			facility = {
				id: facilityResult.id,
				facilityName: facilityResult.facilityName,
				businessHours: facilityResult.businessHours,
				defaultCost: facilityResult.defaultCost
					? Number(facilityResult.defaultCost)
					: null,
				defaultCredit: facilityResult.defaultCredit
					? Number(facilityResult.defaultCredit)
					: null,
				defaultDuration: facilityResult.defaultDuration
					? Number(facilityResult.defaultDuration)
					: null,
			};
		}

		// Validate business hours (if facility has business hours) - only if facility exists
		if (facility) {
			await validateFacilityBusinessHours(
				facility.businessHours,
				rsvpTimeUtc,
				storeTimezone,
				facilityId!,
			);

			// Validate availability based on singleServiceMode - only if facility exists
			await validateRsvpAvailability(
				storeId,
				rsvpSettings,
				rsvpTime,
				facilityId!,
				facility.defaultDuration ?? rsvpSettings?.defaultDuration ?? 60,
			);
		}

		// Check if prepaid is required
		const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;

		// Calculate total cost: facility cost + service staff cost (if applicable)
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
		const totalCost = facilityCost + serviceStaffCost;

		const prepaidRequired = minPrepaidPercentage > 0 && totalCost > 0;
		const requiredPrepaid = prepaidRequired
			? Math.ceil(totalCost * (minPrepaidPercentage / 100))
			: null;

		// Determine if order should be created (whenever totalCost > 0)
		const shouldCreateOrder = totalCost > 0;

		// Determine RSVP status and payment status
		let rsvpStatus = prepaidRequired
			? Number(RsvpStatus.Pending)
			: Number(RsvpStatus.ReadyToConfirm);
		let alreadyPaid = false;
		let orderId: string | null = null;

		try {
			// Create RSVP first, then create order if prepaid is required
			const rsvp = await sqlClient.$transaction(async (tx) => {
				// Step 1: Create RSVP first (without orderId initially)
				const createdRsvp = await tx.rsvp.create({
					data: {
						storeId,
						customerId: finalCustomerId,
						numOfAdult,
						numOfChild,
						rsvpTime,

						message: message || null,
						// Store name and phone for anonymous reservations
						name: finalCustomerId ? null : name || null, // Only store if anonymous
						phone: finalCustomerId ? null : phone || null, // Only store if anonymous

						facilityId: facilityId || null,
						facilityCost:
							facilityCost > 0 ? new Prisma.Decimal(facilityCost) : null,
						facilityCredit:
							facilityCredit > 0 ? new Prisma.Decimal(facilityCredit) : null,
						pricingRuleId: null, // Pricing rules not used in simple reservation flow

						serviceStaffId: serviceStaffId || null,
						serviceStaffCost:
							serviceStaffCost > 0
								? new Prisma.Decimal(serviceStaffCost)
								: null,
						serviceStaffCredit:
							serviceStaffCredit > 0
								? new Prisma.Decimal(serviceStaffCredit)
								: null,

						status: rsvpStatus,
						alreadyPaid,
						orderId: null, // Will be updated after order creation
						confirmedByStore: false,
						confirmedByCustomer: false,
						createdBy,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				});

				// Step 2: If totalCost > 0 and customer is signed in, create order with RSVP ID in note
				if (shouldCreateOrder && finalCustomerId) {
					// Get translation function for order note
					const { t } = await getT();

					// Determine payment method based on store settings
					// If useCustomerCredit is true, use "creditPoint" payment method, otherwise use "TBD"
					const paymentMethodPayUrl = store.useCustomerCredit
						? "creditPoint"
						: "TBD";

					// Create order note with RSVP ID
					const orderNote = `${
						t("rsvp_reservation_payment_note") || "RSVP reservation payment"
					} (RSVP ID: ${createdRsvp.id})`;

					// Calculate facility and service staff costs for order items
					const facilityCostForOrder = facilityCost > 0 ? facilityCost : null;
					const serviceStaffCostForOrder =
						serviceStaffCost > 0 ? serviceStaffCost : null;

					// Calculate order amounts (use full cost, not just prepaid)
					let facilityOrderAmount: number | null = null;
					let serviceStaffOrderAmount: number | null = null;

					if (facilityCostForOrder && serviceStaffCostForOrder) {
						// Both costs exist, use full amounts
						facilityOrderAmount = facilityCostForOrder;
						serviceStaffOrderAmount = serviceStaffCostForOrder;
					} else if (facilityCostForOrder) {
						// Only facility cost
						facilityOrderAmount = facilityCostForOrder;
					} else if (serviceStaffCostForOrder) {
						// Only service staff cost
						serviceStaffOrderAmount = serviceStaffCostForOrder;
					}

					// Create unpaid order (customer will pay at checkout)
					const createdOrderId = await createRsvpStoreOrder({
						tx,
						storeId,
						customerId: finalCustomerId, // finalCustomerId is guaranteed to be non-null here
						facilityCost: facilityOrderAmount,
						serviceStaffCost: serviceStaffOrderAmount,
						currency: store.defaultCurrency || "twd",
						paymentMethodPayUrl,
						rsvpId: createdRsvp.id, // Pass RSVP ID for pickupCode
						facilityId: facilityId || null, // Pass facility ID for pickupCode (optional)
						productName: facility?.facilityName || "Reservation", // Pass facility name for product name
						serviceStaffId: serviceStaffId || null, // Pass service staff ID (optional)
						serviceStaffName, // Pass service staff name for product name (optional)
						rsvpTime, // Pass RSVP time (BigInt epoch)
						note: orderNote,
						displayToCustomer: false, // Internal note, not displayed to customer
						isPaid: false, // Customer will pay at checkout
					});

					// Step 3: Update RSVP with orderId
					await tx.rsvp.update({
						where: { id: createdRsvp.id },
						data: { orderId: createdOrderId },
					});

					orderId = createdOrderId;
				}

				// Return RSVP with all relations
				return await tx.rsvp.findUnique({
					where: { id: createdRsvp.id },
					include: {
						Store: true,
						Customer: true,
						CreatedBy: true,
						Facility: true,
						Order: true,
					},
				});
			});

			if (!rsvp) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_failed_to_create") || "Failed to create reservation",
				);
			}

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			// Send notification for reservation creation
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: rsvp.id,
				storeId: rsvp.storeId,
				eventType: "created",
				customerId: rsvp.customerId,
				customerName: rsvp.Customer?.name || rsvp.name || null,
				customerEmail: rsvp.Customer?.email || null,
				customerPhone: rsvp.Customer?.phoneNumber || rsvp.phone || null,
				storeName: rsvp.Store?.name || store.name || null,
				rsvpTime: rsvp.rsvpTime,
				status: rsvp.status,
				facilityName:
					rsvp.Facility?.facilityName || facility?.facilityName || null,
				serviceStaffName: serviceStaffName,
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				message: rsvp.message || null,
				actionUrl: `/storeAdmin/${rsvp.storeId}/rsvp`,
			});

			return {
				rsvp: transformedRsvp,
				orderId, // Return orderId so frontend can redirect to checkout
				// If order should be created and user is anonymous, they need to sign in first
				requiresSignIn: shouldCreateOrder && isAnonymous,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_already_exists") || "Reservation already exists.",
				);
			}

			throw error;
		}
	});
