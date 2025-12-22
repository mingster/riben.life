"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { ProductStatus } from "@/types/enum";

/**
 * Ensures the special system product for credit recharge exists for a store.
 * Creates it if it doesn't exist, or returns the existing product.
 * This product is used as the productId in OrderItem entries for credit recharge orders.
 *
 * @param storeId - The store ID
 * @returns The credit recharge product (created or existing)
 */
export async function ensureCreditRechargeProduct(storeId: string) {
	// Check if product already exists
	const existingProduct = await sqlClient.product.findFirst({
		where: {
			storeId,
			name: {
				contains: "Store Credit",
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

	// Create the credit recharge product
	const now = getUtcNowEpoch();
	const product = await sqlClient.product.create({
		data: {
			storeId,
			name: "Store Credit",
			description: "Store Credit product for customer credit top-ups",
			price: new Prisma.Decimal(0), // Price is determined by creditExchangeRate at time of purchase
			currency: store.defaultCurrency,
			status: ProductStatus.Published,
			isFeatured: false,
			useOption: false, // No product options for credit recharge
			createdAt: now,
			updatedAt: now,
		},
	});

	return product;
}
