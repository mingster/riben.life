"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { ProductStatus } from "@/types/enum";

/**
 * Ensures the special system product for reservation prepaid exists for a store.
 * Creates it if it doesn't exist, or returns the existing product.
 * This product is used as the productId in OrderItem entries for RSVP reservation prepaid orders.
 *
 * @param storeId - The store ID
 * @returns The reservation prepaid product (created or existing)
 */
export async function ensureReservationPrepaidProduct(storeId: string) {
	// Check if product already exists
	const existingProduct = await sqlClient.product.findFirst({
		where: {
			storeId,
			name: {
				contains: "Reservation Prepaid",
				mode: "insensitive",
			},
		},
	});

	if (existingProduct) {
		return existingProduct;
	}

	// Get store to get default currency
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			id: true,
			defaultCurrency: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// Create the reservation prepaid product
	const now = getUtcNowEpoch();
	const product = await sqlClient.product.create({
		data: {
			storeId,
			name: "Reservation Prepaid",
			description:
				"Reservation Prepaid product for RSVP reservation prepaid payments",
			price: new Prisma.Decimal(0), // Price is determined by facility cost and prepaid percentage at time of reservation
			currency: store.defaultCurrency,
			status: ProductStatus.Published,
			isFeatured: false,
			useOption: false, // No product options for reservation prepaid
			createdAt: now,
			updatedAt: now,
		},
	});

	return product;
}
