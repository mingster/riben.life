"use server";

import { createRechargeOrderSchema } from "./create-recharge-order.validation";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Create a recharge order for customer credit top-up.
 * This creates a StoreOrder that will be paid via Stripe.
 * After payment is confirmed, processCreditTopUpAfterPayment should be called.
 */
export const createRechargeOrderAction = userRequiredActionClient
	.metadata({ name: "createRechargeOrder" })
	.schema(createRechargeOrderSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, amount } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Get store and validate credit system is enabled
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				useCustomerCredit: true,
				creditMinPurchase: true,
				creditMaxPurchase: true,
				defaultCurrency: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		if (!store.useCustomerCredit) {
			throw new SafeError("Customer credit system is not enabled for this store");
		}

		// Validate amount against min/max limits
		const minPurchase = Number(store.creditMinPurchase);
		const maxPurchase = Number(store.creditMaxPurchase);

		if (minPurchase > 0 && amount < minPurchase) {
			throw new SafeError(
				`Minimum purchase amount is ${minPurchase} ${store.defaultCurrency.toUpperCase()}`,
			);
		}

		if (maxPurchase > 0 && amount > maxPurchase) {
			throw new SafeError(
				`Maximum purchase amount is ${maxPurchase} ${store.defaultCurrency.toUpperCase()}`,
			);
		}

		// Get default shipping method (required for StoreOrder)
		const defaultShippingMethod = await sqlClient.shippingMethod.findFirst({
			where: { isDefault: true, isDeleted: false },
		});

		if (!defaultShippingMethod) {
			throw new SafeError("No shipping method available");
		}

		// Create StoreOrder for recharge
		const now = getUtcNowEpoch();

		const order = await sqlClient.storeOrder.create({
			data: {
				storeId,
				userId,
				facilityId: undefined, // Optional field - use undefined instead of null
				isPaid: false,
				orderTotal: new Prisma.Decimal(amount),
				currency: store.defaultCurrency,
				paymentMethodId: "stripe", // Default to stripe for credit recharge
				shippingMethodId: defaultShippingMethod.id,
				pickupCode: undefined, // Optional field - use undefined instead of null
				createdAt: now,
				updatedAt: now,
				paymentStatus: PaymentStatus.Pending,
				orderStatus: OrderStatus.Pending,
				OrderNotes: {
					create: {
						note: `Credit recharge: ${amount} ${store.defaultCurrency.toUpperCase()}`,
						displayToCustomer: true,
						createdAt: now,
						updatedAt: now,
					},
				},
			},
			include: {
				Store: true,
				User: true,
				PaymentMethod: true,
			},
		});

		transformPrismaDataForJson(order);

		return { order };
	});

