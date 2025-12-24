"use server";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

interface CreateRsvpStoreOrderParams {
	tx: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	storeId: string;
	customerId: string;
	orderTotal: number; // Cash value in store currency
	currency: string;
	note?: string; // Optional order note
	isPaid?: boolean; // Whether the order is already paid (default: true for prepaid)
}

/**
 * Creates a store order for an RSVP reservation.
 * Uses "digital" shipping method if available, otherwise falls back to default shipping method.
 * Uses "TBD" (To Be Determined) payment method, as the customer will choose payment method later.
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
		note,
		isPaid = true,
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

	// Find TBD payment method (payment method to be determined by customer)
	const tbdPaymentMethod = await tx.paymentMethod.findFirst({
		where: {
			payUrl: "TBD",
			isDeleted: false,
		},
	});

	if (!tbdPaymentMethod) {
		throw new SafeError("TBD payment method not found");
	}

	// Create the store order
	const storeOrder = await tx.storeOrder.create({
		data: {
			storeId,
			userId: customerId,
			orderTotal: new Prisma.Decimal(orderTotal),
			currency: currency.toLowerCase(),
			paymentMethodId: tbdPaymentMethod.id,
			shippingMethodId: defaultShippingMethod.id,
			orderStatus: isPaid
				? Number(OrderStatus.Confirmed)
				: Number(OrderStatus.Pending),
			paymentStatus: isPaid
				? Number(PaymentStatus.Paid)
				: Number(PaymentStatus.Pending),
			isPaid,
			...(isPaid && { paidDate: getUtcNowEpoch() }),
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
			...(note && {
				OrderNotes: {
					create: {
						note,
						displayToCustomer: true,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				},
			}),
		},
	});

	return storeOrder.id;
}
