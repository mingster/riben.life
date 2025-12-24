"use server";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ensureReservationPrepaidProduct } from "./ensure-reservation-prepaid-product";

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
	note?: string; // Optional order note
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
		note,
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

	const now = getUtcNowEpoch();

	// Create the store order
	const storeOrder = await tx.storeOrder.create({
		data: {
			storeId,
			userId: customerId,
			orderTotal: new Prisma.Decimal(orderTotal),
			currency: currency.toLowerCase(),
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
					productName: reservationPrepaidProduct.name,
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
						displayToCustomer: true,
						createdAt: now,
						updatedAt: now,
					},
				},
			}),
		},
	});

	return storeOrder.id;
}
