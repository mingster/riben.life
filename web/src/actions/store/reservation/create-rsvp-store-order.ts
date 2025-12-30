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
	orderTotal: number; // Cash value in store currency
	currency: string;
	paymentMethodPayUrl: string; // Payment method identifier (e.g., "credit", "TBD")
	rsvpId: string; // RSVP reservation ID
	facilityId: string; // Facility ID
	facilityName: string; // Facility name for product name
	rsvpTime: bigint; // RSVP reservation time (BigInt epoch milliseconds)
	note?: string; // Optional order note
	displayToCustomer?: boolean; // Whether to display note to customer (default: true)
	isPaid?: boolean; // Whether the order is already paid (default: false for checkout flow)
}

/**
 * Creates a store order for an RSVP reservation.
 * Uses "digital" shipping method if available, otherwise falls back to default shipping method.
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
		orderTotal,
		currency,
		paymentMethodPayUrl,
		rsvpId,
		facilityId,
		facilityName,
		rsvpTime,
		note,
		displayToCustomer = false, // Default to true for customer-visible notes
		isPaid = false, // Default to false for checkout flow
	} = params;

	// Find "digital" shipping method for reservation orders (preferred)
	const digitalShippingMethod = await tx.shippingMethod.findFirst({
		where: {
			identifier: "digital",
			isDeleted: false,
		},
	});

	// Fall back to default shipping method if "digital" not found
	const defaultShippingMethod = digitalShippingMethod
		? digitalShippingMethod
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

	// Create pickupCode with RSVP ID and facility ID
	const pickupCode = `RSVP:${rsvpId}|FACILITY:${facilityId}`;

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

	// Build product name using i18n key: 預約{{facilityName}} - {{rsvpTime}}
	const productName = t("rsvp_order_product_name", {
		facilityName,
		rsvpTime: formattedRsvpTime || "",
	});

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
				create: {
					productId: reservationPrepaidProduct.id,
					productName, // Format: 預約{{facilityName}} - {{formattedRsvpTime}}
					quantity: 1, // Single prepaid payment
					unitPrice: new Prisma.Decimal(orderTotal), // Prepaid amount
					unitDiscount: new Prisma.Decimal(0),
					variants: null,
					variantCosts: null,
				},
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
