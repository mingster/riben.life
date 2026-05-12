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
import { validateReservationTimeWindow } from "@/actions/store/reservation/validate-reservation-time-window";
import { validateRsvpAvailability } from "@/actions/store/reservation/validate-rsvp-availability";
import { validateServiceStaffBusinessHours } from "@/actions/store/reservation/validate-service-staff-business-hours";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { resolveRsvpStoreOrderPaymentMethodPayUrl } from "@/lib/payment/resolve-rsvp-store-order-payment-method-pay-url";
import { getT } from "@/app/i18n";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { ensureCustomerIsStoreMember } from "@/utils/store-member-utils";
import { queueRsvpGoogleCalendarSync } from "@/lib/google-calendar/sync-rsvp-to-google-calendar";
import { trackReserveWithGoogleConversionEvent } from "@/lib/reserve-with-google";
import { generateCheckInCode } from "@/utils/check-in-code";
import { MemberRole } from "@/types/enum";
import { getRsvpConversationMessage } from "@/lib/reservation/conversation-utils";
import { computeRequiredRsvpPrepaidMajor } from "@/lib/reservation/prepaid-utils";

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
			message,
			alreadyPaid,
			confirmedByStore,
			confirmedByCustomer,
			facilityCost,
			pricingRuleId,
			source,
			externalSource,
			externalTrackingId,
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
				storeId,
				serviceStaffId,
				facilityId || null,
				rsvpTimeUtc,
				storeTimezone,
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
				minPrepaidAmount: true,
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
				where: { storeId, isDeleted: false, capacity: { gt: 0 } },
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
		const requiredPrepaidMajor = computeRequiredRsvpPrepaidMajor({
			minPrepaidPercentage: rsvpSettings?.minPrepaidPercentage ?? 0,
			minPrepaidAmount: rsvpSettings?.minPrepaidAmount ?? 0,
			totalCostMajor: totalCost,
		});
		const orderAmount = totalCost > 0 ? totalCost : requiredPrepaidMajor;

		// For admin-created RSVPs, we don't process prepaid payment (no credit deduction)
		// Just create an unpaid store order for the customer to pay later
		// No payment amount → treat as ready to serve; payment due → pending until paid
		const finalStatus = orderAmount > 0 ? RsvpStatus.Pending : RsvpStatus.Ready;
		const finalAlreadyPaid = alreadyPaid;
		let finalOrderId: string | null = null;

		try {
			const rsvp = await sqlClient.$transaction(async (tx) => {
				const checkInCode = await generateCheckInCode(storeId, tx);
				const initialConversationMessage = message?.trim() || null;
				const createdRsvp = await tx.rsvp.create({
					data: {
						storeId,
						checkInCode,
						customerId: customerId || null,
						facilityId: facilityId || null,
						serviceStaffId: serviceStaffId,
						numOfAdult,
						numOfChild,
						rsvpTime,
						arriveTime: arriveTime || null,
						status: finalStatus,
						alreadyPaid: finalAlreadyPaid,
						orderId: finalOrderId || null,
						source: source?.trim() || null,
						externalSource: externalSource?.trim() || null,
						externalTrackingId: externalTrackingId?.trim() || null,
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

				if (initialConversationMessage) {
					const now = getUtcNowEpoch();
					await tx.rsvpConversation.create({
						data: {
							rsvpId: createdRsvp.id,
							storeId,
							customerId: customerId || null,
							lastMessageAt: now,
							createdAt: now,
							updatedAt: now,
							Messages: {
								create: {
									rsvpId: createdRsvp.id,
									storeId,
									senderUserId: createdBy || null,
									senderType: "store",
									message: initialConversationMessage,
									createdAt: now,
									updatedAt: now,
								},
							},
						},
					});
				}

				// Ensure customer becomes a store member if customerId is provided
				if (customerId) {
					await ensureCustomerIsStoreMember(
						storeId,
						customerId,
						MemberRole.customer,
						tx,
					);
				}

				// Admin-created RSVPs use only Pending/Ready; credit-on-completion is handled when status
				// is updated elsewhere, not at initial create.
				// Create unpaid store order for customer to pay for the RSVP
				if (customerId && orderAmount > 0) {
					// Get translation function for order note
					const { t } = await getT();

					// Order note same format as store side
					const orderNote = `${
						t("rsvp_reservation_payment_note") || "RSVP reservation payment"
					} (RSVP ID: ${createdRsvp.id})`;

					// Calculate order amounts (similar to customer-created RSVPs)
					const facilityCostForOrder = facilityId
						? (calculatedFacilityCost ?? 0)
						: null;
					const serviceStaffCostForOrder = serviceStaffId
						? (calculatedServiceStaffCost ?? 0)
						: null;

					// Determine product name (prefer facility name, fallback to service staff name, then default)
					const productNameForOrder =
						facility?.facilityName ||
						serviceStaff?.userName ||
						serviceStaff?.userEmail ||
						t("facility_name") ||
						"Reservation";

					const paymentMethodPayUrl =
						await resolveRsvpStoreOrderPaymentMethodPayUrl(
							tx,
							storeId,
							store.useCustomerCredit,
						);

					finalOrderId = await createRsvpStoreOrder({
						tx,
						storeId,
						customerId,
						facilityCost: facilityCostForOrder,
						serviceStaffCost: serviceStaffCostForOrder,
						currency: store.defaultCurrency || "twd",
						paymentMethodPayUrl,
						rsvpId: createdRsvp.id, // Pass RSVP ID for pickupCode
						facilityId: facility?.id || null, // Pass facility ID for pickupCode (optional)
						productName: productNameForOrder, // Pass facility or service staff name for product name
						serviceStaffId: serviceStaffId, // Service staff ID if provided
						serviceStaffName:
							serviceStaff?.userName || serviceStaff?.userEmail || null, // Service staff name if provided
						rsvpTime: createdRsvp.rsvpTime, // Pass RSVP time (BigInt epoch)
						note: orderNote,
						displayToCustomer: false, // Internal note, not displayed to customer
						isPaid: false, // Unpaid order for customer to pay later
						requiredPrepaidMajor,
					});

					// Link RSVP to order so processRsvpAfterPaymentAction runs when mark-as-paid
					await tx.rsvp.update({
						where: { id: createdRsvp.id },
						data: {
							orderId: finalOrderId,
							updatedAt: getUtcNowEpoch(),
						},
					});
				}

				return createdRsvp;
			});

			const shouldNotifyUnpaid = Boolean(finalOrderId && customerId);
			const shouldNotifyCustomerCreated =
				orderAmount > 0 && Boolean(customerId);
			const shouldNotifyStaffCreated = !(finalOrderId && customerId);

			if (
				shouldNotifyUnpaid ||
				shouldNotifyCustomerCreated ||
				shouldNotifyStaffCreated
			) {
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

				if (rsvpForNotification) {
					const notificationRouter = getRsvpNotificationRouter();
					const baseNotification = {
						rsvpId: rsvpForNotification.id,
						storeId: rsvpForNotification.storeId,
						checkInCode: rsvpForNotification.checkInCode ?? null,
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
						orderId: rsvpForNotification.orderId,
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
						message: getRsvpConversationMessage(rsvpForNotification),
					};

					if (shouldNotifyUnpaid && rsvpForNotification.Order) {
						await notificationRouter.routeNotification({
							...baseNotification,
							eventType: "unpaid_order_created",
							orderId: finalOrderId,
						});
					}

					if (shouldNotifyCustomerCreated) {
						await notificationRouter.routeNotification({
							...baseNotification,
							eventType: "created",
							notifyCustomerReservationCreated: true,
							skipStoreStaffOnCreated: true,
						});
					}

					if (shouldNotifyStaffCreated) {
						await notificationRouter.routeNotification({
							...baseNotification,
							eventType: "created",
							actionUrl: `/storeAdmin/${rsvpForNotification.storeId}/rsvp/history`,
						});
					}
				}
			}
			queueRsvpGoogleCalendarSync(rsvp.id);
			await trackReserveWithGoogleConversionEvent({
				rsvpId: rsvp.id,
				storeId: rsvp.storeId,
				eventType: "created",
				source: rsvp.source,
				externalSource: rsvp.externalSource,
				externalTrackingId: rsvp.externalTrackingId,
			});

			const rsvpForReturn =
				(await sqlClient.rsvp.findUnique({
					where: { id: rsvp.id },
					include: {
						Store: true,
						Customer: true,
						Order: true,
						Facility: true,
						FacilityPricingRule: true,
						RsvpConversation: {
							include: {
								Messages: {
									where: { deletedAt: null },
									orderBy: { createdAt: "asc" },
								},
							},
						},
						CreatedBy: true,
						ServiceStaff: {
							include: {
								User: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				})) ?? rsvp;
			const transformedRsvp = { ...rsvpForReturn } as Rsvp;
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
