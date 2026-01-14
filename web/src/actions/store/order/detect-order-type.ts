"use server";

import { sqlClient } from "@/lib/prismadb";
import { ensureFiatRefillProduct } from "@/actions/store/credit/ensure-fiat-refill-product";
import { ensureCreditRefillProduct } from "@/actions/store/credit/ensure-credit-refill-product";
import logger from "@/lib/logger";

interface OrderForDetection {
	id: string;
	storeId: string;
	checkoutAttributes?: string | null;
	OrderItemView?: Array<{
		id: string;
		productId: string;
		name: string;
	}>;
}

/**
 * Detect if an order is a fiat refill (account balance) order.
 * Primary check: productId matches fiatRefillProduct.id (most reliable)
 * Fallback checks: checkoutAttributes and product name
 */
export async function isFiatRefillOrder(
	order: OrderForDetection,
): Promise<boolean> {
	if (!order.OrderItemView || order.OrderItemView.length === 0) {
		return false;
	}

	// Primary check: Check if any OrderItem has productId matching fiatRefillProduct.id
	try {
		const fiatRefillProduct = await ensureFiatRefillProduct(order.storeId);
		const hasFiatRefillProduct = order.OrderItemView.some(
			(item) => item.productId === fiatRefillProduct.id,
		);
		if (hasFiatRefillProduct) {
			return true;
		}
	} catch (error) {
		logger.warn(
			"Failed to get fiat refill product, falling back to other checks",
			{
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["order", "detection", "fiat"],
			},
		);
	}

	// Fallback 1: Check checkoutAttributes for fiatRefill flag
	if (order.checkoutAttributes) {
		try {
			const parsed = JSON.parse(order.checkoutAttributes);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				parsed.fiatRefill === true
			) {
				return true;
			}
		} catch {
			// If parsing fails, fall back to product name check
		}
	}

	// Fallback 2: Check OrderItemView product name
	const hasFiatRefillName = order.OrderItemView.some(
		(item) =>
			item.name === "Refill Account Balance" ||
			item.name.toLowerCase().includes("refill account balance") ||
			item.name.toLowerCase().includes("儲值餘額"), // Traditional Chinese translation
	);

	return hasFiatRefillName;
}

/**
 * Detect if an order is a credit refill (credit points) order.
 * Primary check: productId matches creditRefillProduct.id (most reliable)
 * Fallback checks: checkoutAttributes and product name
 */
export async function isCreditRefillOrder(
	order: OrderForDetection,
): Promise<boolean> {
	if (!order.OrderItemView || order.OrderItemView.length === 0) {
		return false;
	}

	// Primary check: Check if any OrderItem has productId matching creditRefillProduct.id
	try {
		const creditRefillProduct = await ensureCreditRefillProduct(order.storeId);
		const hasCreditRefillProduct = order.OrderItemView.some(
			(item) => item.productId === creditRefillProduct.id,
		);
		if (hasCreditRefillProduct) {
			return true;
		}
	} catch (error) {
		logger.warn(
			"Failed to get credit refill product, falling back to other checks",
			{
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["order", "detection", "credit"],
			},
		);
	}

	// Fallback 1: Check checkoutAttributes for creditRefill flag
	if (order.checkoutAttributes) {
		try {
			const parsed = JSON.parse(order.checkoutAttributes);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				parsed.creditRefill === true
			) {
				return true;
			}
		} catch {
			// If parsing fails, fall back to product name check
		}
	}

	// Fallback 2: Check OrderItemView product name
	const hasStoreCreditName = order.OrderItemView.some(
		(item) =>
			item.name === "Store Credit" ||
			item.name.toLowerCase().includes("store credit") ||
			item.name.toLowerCase().includes("儲值點數"), // Traditional Chinese translation
	);

	return hasStoreCreditName;
}

/**
 * Detect if an order is for an RSVP reservation.
 */
export async function isRsvpOrder(orderId: string): Promise<boolean> {
	const rsvp = await sqlClient.rsvp.findFirst({
		where: { orderId },
	});
	return !!rsvp;
}
