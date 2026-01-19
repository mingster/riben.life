"use server";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import {
	getUtcNowEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ensureReservationPrepaidProduct } from "./ensure-reservation-prepaid-product";
import { getT } from "@/app/i18n";
import { ensureCustomerIsStoreMember } from "@/utils/store-member-utils";
import { format } from "date-fns";

interface CreateRsvpStoreOrderParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	facilityCost: number | null; // Facility cost (optional)
	serviceStaffCost: number | null; // Service staff cost (optional)
	currency: string;
	paymentMethodPayUrl: string; // Payment method identifier (e.g., "credit", "TBD")
	rsvpId: string; // RSVP reservation ID
	facilityId: string | null; // Facility ID (optional)
	productName: string; // Product name for product name
	serviceStaffId: string | null; // Service staff ID (optional)
	serviceStaffName: string | null; // Service staff name for product name (optional)
	rsvpTime: bigint; // RSVP reservation time (BigInt epoch milliseconds)
	note?: string; // Optional order note
	displayToCustomer?: boolean; // Whether to display note to customer (default: true)
	isPaid?: boolean; // Whether the order is already paid (default: false for checkout flow)
}

/**
 * Creates a store order for an RSVP reservation.
 * Uses "reserve" shipping method if available, otherwise falls back to default shipping method.
 * Uses the specified payment method (e.g., "credit" or "TBD").
 *
 * @param params - Parameters for creating the order
 * @returns The created store order ID
 * @throws SafeError if shipping or payment methods are not found
 */
export async function createRsvpStoreOrder(
	params: CreateRsvpStoreOrderParams,
): Promise<string> {
	const {
		tx,
		storeId,
		customerId,
		facilityCost,
		serviceStaffCost,
		currency,
		paymentMethodPayUrl,
		rsvpId,
		facilityId,
		productName: facilityName,
		serviceStaffId,
		serviceStaffName,
		rsvpTime,
		note,
		displayToCustomer = false, // Default to true for customer-visible notes
		isPaid = false, // Default to false for checkout flow
	} = params;

	// Calculate total cost from facility and service staff costs
	const orderTotal = (facilityCost ?? 0) + (serviceStaffCost ?? 0);

	// Ensure at least one cost is provided
	if (orderTotal <= 0) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_order_total_must_be_greater_than_zero") ||
				"Order total must be greater than 0",
		);
	}

	// Find "reserve" shipping method for reservation orders (preferred)
	const reserveShippingMethod = await tx.shippingMethod.findFirst({
		where: {
			identifier: "reserve",
			isDeleted: false,
		},
	});

	// Fall back to default shipping method if "reserve" not found
	const defaultShippingMethod = reserveShippingMethod
		? reserveShippingMethod
		: await tx.shippingMethod.findFirst({
				where: { isDefault: true, isDeleted: false },
			});

	if (!defaultShippingMethod) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_no_shipping_method_available") || "No shipping method available",
		);
	}

	// Find payment method by payUrl identifier
	const paymentMethod = await tx.paymentMethod.findFirst({
		where: {
			payUrl: paymentMethodPayUrl,
			isDeleted: false,
		},
	});

	if (!paymentMethod) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_payment_method_not_found", {
				payUrl: paymentMethodPayUrl,
			}) || `Payment method with identifier "${paymentMethodPayUrl}" not found`,
		);
	}

	const reservationPrepaidProduct =
		await ensureReservationPrepaidProduct(storeId);

	if (!reservationPrepaidProduct) {
		const { t } = await getT();
		throw new SafeError(
			t("rsvp_reservation_prepaid_product_not_found") ||
				"Reservation prepaid product not found",
		);
	}

	// Fetch store to get defaultCurrency and timezone at the time of creation
	const store = await tx.store.findUnique({
		where: { id: storeId },
		select: {
			defaultCurrency: true,
			defaultTimezone: true,
		},
	});

	if (!store) {
		const { t } = await getT();
		throw new SafeError(t("rsvp_store_not_found") || "Store not found");
	}

	const now = getUtcNowEpoch();

	// Add customer as store member (within transaction)
	await ensureCustomerIsStoreMember(storeId, customerId, "user", tx);

	// Create pickupCode with RSVP ID and facility ID (if provided)
	const pickupCode = facilityId
		? `RSVP:${rsvpId}|FACILITY:${facilityId}`
		: `RSVP:${rsvpId}`;

	const { t } = await getT();

	// Use store's defaultCurrency at the time of creation
	const orderCurrency = (
		store.defaultCurrency ||
		currency ||
		"twd"
	).toUpperCase();

	// Format rsvpTime for product name using i18n datetime format
	const storeTimezone = store.defaultTimezone || "Asia/Taipei";
	const datetimeFormat = t("datetime_format");
	const rsvpTimeDate = epochToDate(rsvpTime);
	let formattedRsvpTime = "";
	if (rsvpTimeDate) {
		const storeDate = getDateInTz(rsvpTimeDate, getOffsetHours(storeTimezone));
		formattedRsvpTime = format(storeDate, `${datetimeFormat} HH:mm`);
	}

	// Build order items array
	const orderItems: Array<{
		productId: string;
		productName: string;
		quantity: number;
		unitPrice: Prisma.Decimal;
		unitDiscount: Prisma.Decimal;
		variants: null;
		variantCosts: null;
	}> = [];

	// Check if this is an import order (productName is not the default "RSVP Import" or "Reservation")
	const isImportOrder =
		facilityName &&
		facilityName !== "RSVP Import" &&
		facilityName !== "Reservation";

	if (isImportOrder) {
		// For import orders: Use only line item #1 with product name and total cost
		orderItems.push({
			productId: reservationPrepaidProduct.id,
			productName: facilityName, // Product name from import (e.g., "網球課10H")
			quantity: 1,
			unitPrice: new Prisma.Decimal(orderTotal), // Total cost (facilityCost + serviceStaffCost)
			unitDiscount: new Prisma.Decimal(0),
			variants: null,
			variantCosts: null,
		});
	} else {
		// For regular RSVP orders: Use line items #1, #2, #3 structure
		// Line item #1: Always add "Reservation" line item with cost 0
		const reservationProductName =
			t("rsvp_order_reservation_name", {
				rsvpTime: formattedRsvpTime || "",
			}) || `Reservation (${formattedRsvpTime || ""})`;

		orderItems.push({
			productId: reservationPrepaidProduct.id,
			productName: reservationProductName,
			quantity: 1,
			unitPrice: new Prisma.Decimal(0), // Reservation line item always has cost 0
			unitDiscount: new Prisma.Decimal(0),
			variants: null,
			variantCosts: null,
		});

		// Line item #2: Add facility order item if facilityCost is provided
		if (facilityCost !== null) {
			const facilityProductName =
				t("rsvp_order_facility_name", {
					facilityName,
				}) || facilityName;
			orderItems.push({
				productId: reservationPrepaidProduct.id,
				productName: facilityProductName,
				quantity: 1,
				unitPrice: new Prisma.Decimal(facilityCost),
				unitDiscount: new Prisma.Decimal(0),
				variants: null,
				variantCosts: null,
			});
		}

		// Line item #3: Add service staff order item if serviceStaffCost is provided
		if (serviceStaffCost !== null) {
			// Double-check: Ensure cost is actually positive (defensive programming)
			const validatedServiceStaffCost = Number(serviceStaffCost);
			if (isNaN(validatedServiceStaffCost) || validatedServiceStaffCost <= 0) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_service_staff_cost_must_be_positive") ||
						"Service staff cost must be a positive number",
				);
			}

			let serviceStaffProductName: string;

			if (serviceStaffName) {
				// Use service staff name
				serviceStaffProductName =
					t("rsvp_order_service_staff_name", {
						serviceStaffName,
					}) || serviceStaffName;
			} else {
				// Fallback if no service staff name provided
				serviceStaffProductName = t("service_staff") || "Service Staff";
			}

			orderItems.push({
				productId: reservationPrepaidProduct.id,
				productName: serviceStaffProductName,
				quantity: 1,
				unitPrice: new Prisma.Decimal(validatedServiceStaffCost),
				unitDiscount: new Prisma.Decimal(0),
				variants: null,
				variantCosts: null,
			});
		}
	}

	// Validate that sum of all line items equals order total
	// Calculate: (unitPrice * quantity) - (unitDiscount * quantity) for each item
	const lineItemsSum = orderItems.reduce((sum, item) => {
		const itemTotal =
			Number(item.unitPrice) * item.quantity -
			Number(item.unitDiscount) * item.quantity;
		return sum + itemTotal;
	}, 0);
	const totalDifference = Math.abs(lineItemsSum - orderTotal);
	if (totalDifference > 0.01) {
		// Allow small floating point differences (0.01)
		const { t: tError } = await getT();
		throw new SafeError(
			tError("rsvp_order_line_items_sum_mismatch") ||
				`Line items sum (${lineItemsSum.toFixed(2)}) does not equal order total (${orderTotal.toFixed(2)})`,
		);
	}

	// Create the store order
	const storeOrder = await tx.storeOrder.create({
		data: {
			storeId,
			userId: customerId,
			facilityId, // Store facility ID in order
			pickupCode, // Store RSVP ID and facility ID in pickupCode
			orderTotal: new Prisma.Decimal(orderTotal),
			currency: orderCurrency,
			paymentMethodId: paymentMethod.id,
			shippingMethodId: defaultShippingMethod.id,
			orderStatus: isPaid
				? Number(OrderStatus.Confirmed)
				: Number(OrderStatus.Pending),
			paymentStatus: isPaid
				? Number(PaymentStatus.Paid)
				: Number(PaymentStatus.Pending),
			isPaid,
			...(isPaid && { paidDate: now }),
			createdAt: now,
			updatedAt: now,
			OrderItems: {
				create: orderItems,
			},
			...(note && {
				OrderNotes: {
					create: {
						note,
						displayToCustomer,
						createdAt: now,
						updatedAt: now,
					},
				},
			}),
		},
	});

	return storeOrder.id;
}
