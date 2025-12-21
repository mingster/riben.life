"use server";

import { createOrderSchema } from "./create-order.validation";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getRandomNum } from "@/utils/utils";
import logger from "@/lib/logger";

/**
 * Create a store order (checkout).
 * This creates a StoreOrder with pending payment status.
 * After order creation, payment processing should be handled separately.
 */
export const createOrderAction = userRequiredActionClient
	.metadata({ name: "createOrder" })
	.schema(createOrderSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			userId,
			facilityId,
			total,
			currency,
			productIds,
			quantities,
			unitPrices,
			variants,
			variantCosts,
			orderNote,
			shippingMethodId,
			paymentMethodId,
		} = parsedInput;

		// Validate product IDs exist
		const products = await sqlClient.product.findMany({
			where: {
				id: {
					in: productIds,
				},
				storeId, // Ensure products belong to this store
			},
		});

		if (!products || products.length !== productIds.length) {
			throw new SafeError(
				"Some products were not found or do not belong to this store",
			);
		}

		// Validate store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Validate shipping method exists
		const shippingMethod = await sqlClient.shippingMethod.findUnique({
			where: { id: shippingMethodId },
		});

		if (!shippingMethod || shippingMethod.isDeleted) {
			throw new SafeError("Shipping method not found");
		}

		// Validate payment method exists
		const paymentMethod = await sqlClient.paymentMethod.findUnique({
			where: { id: paymentMethodId },
		});

		if (!paymentMethod || paymentMethod.isDeleted) {
			throw new SafeError("Payment method not found");
		}

		const now = getUtcNowEpoch();

		// Determine order status based on store auto-accept setting
		const orderStatus = store.autoAcceptOrder
			? OrderStatus.Processing
			: OrderStatus.Pending;

		// Create order with order items
		const result = await sqlClient.storeOrder.create({
			data: {
				storeId,
				userId: userId || null,
				facilityId: facilityId || null,
				isPaid: false,
				orderTotal: new Prisma.Decimal(total),
				currency,
				paymentMethodId,
				shippingMethodId,
				pickupCode: getRandomNum(6),
				createdAt: now,
				updatedAt: now,
				paymentStatus: PaymentStatus.Pending,
				orderStatus,
				OrderItems: {
					createMany: {
						data: products.map((product, index: number) => ({
							productId: product.id,
							productName: product.name,
							variants: variants?.[index] || null,
							variantCosts: variantCosts?.[index] || null,
							quantity: quantities[index],
							unitPrice: unitPrices[index],
						})),
					},
				},
				OrderNotes: {
					create: {
						note: orderNote || "",
						displayToCustomer: true,
						createdAt: now,
						updatedAt: now,
					},
				},
			},
		});

		// Fetch complete order with relations
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: result.id },
			include: {
				Store: true,
				OrderNotes: true,
				OrderItemView: true,
				User: true,
				ShippingMethod: true,
				PaymentMethod: true,
			},
		});

		if (!order) {
			throw new SafeError("Failed to retrieve created order");
		}

		transformPrismaDataForJson(order);

		logger.info("Order created", {
			metadata: {
				orderId: order.id,
				storeId,
				userId: userId || null,
				total: Number(total),
			},
			tags: ["order", "create"],
		});

		return { order };
	});
