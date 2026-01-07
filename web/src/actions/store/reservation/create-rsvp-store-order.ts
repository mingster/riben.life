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
	facilityName: string; // Facility name for product name
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
		facilityName,
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
		throw new SafeError("Order total must be greater than 0");
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
		throw new SafeError("No shipping method available");
	}

	// Find payment method by payUrl identifier
	const paymentMethod = await tx.paymentMethod.findFirst({
		where: {
			payUrl: paymentMethodPayUrl,
			isDeleted: false,
		},
	});

	if (!paymentMethod) {
		throw new SafeError(
			`Payment method with identifier "${paymentMethodPayUrl}" not found`,
		);
	}

	const reservationPrepaidProduct =
		await ensureReservationPrepaidProduct(storeId);

	if (!reservationPrepaidProduct) {
		throw new SafeError("Reservation prepaid product not found");
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
		throw new SafeError("Store not found");
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
	).toLowerCase();

	// Format rsvpTime for product name: yyyy/MM/dd HH:mm
	const storeTimezone = store.defaultTimezone || "Asia/Taipei";
	const rsvpTimeDate = epochToDate(rsvpTime);
	let formattedRsvpTime = "";
	if (rsvpTimeDate) {
		const storeDate = getDateInTz(rsvpTimeDate, getOffsetHours(storeTimezone));
		formattedRsvpTime = format(storeDate, "yyyy/MM/dd HH:mm");
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

	// Add facility order item if facilityCost is provided
	if (facilityCost !== null && facilityCost > 0) {
		const facilityProductName = t("rsvp_order_product_name", {
			facilityName,
			rsvpTime: formattedRsvpTime || "",
		});
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

	// Add service staff order item if serviceStaffCost is provided
	if (serviceStaffCost !== null && serviceStaffCost > 0 && serviceStaffName) {
		const serviceStaffProductName = t("rsvp_order_service_staff_product_name", {
			serviceStaffName,
			rsvpTime: formattedRsvpTime || "",
		});
		orderItems.push({
			productId: reservationPrepaidProduct.id,
			productName: serviceStaffProductName,
			quantity: 1,
			unitPrice: new Prisma.Decimal(serviceStaffCost),
			unitDiscount: new Prisma.Decimal(0),
			variants: null,
			variantCosts: null,
		});
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
