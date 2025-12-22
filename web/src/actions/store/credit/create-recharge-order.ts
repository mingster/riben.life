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
		const { storeId, creditAmount, paymentMethodId, rsvpId } = parsedInput;

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
				creditExchangeRate: true,
				defaultCurrency: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		if (!store.useCustomerCredit) {
			throw new SafeError(
				"Customer credit system is not enabled for this store",
			);
		}

		// Validate credit amount against min/max limits (in credit points)
		const minPurchase = Number(store.creditMinPurchase);
		const maxPurchase = Number(store.creditMaxPurchase);

		if (minPurchase > 0 && creditAmount < minPurchase) {
			throw new SafeError(`Minimum credit purchase is ${minPurchase} points`);
		}

		if (maxPurchase > 0 && creditAmount > maxPurchase) {
			throw new SafeError(`Maximum credit purchase is ${maxPurchase} points`);
		}

		// Calculate dollar amount from credit amount
		const creditExchangeRate = Number(store.creditExchangeRate);
		if (creditExchangeRate <= 0) {
			throw new SafeError("Credit exchange rate is not configured");
		}

		const dollarAmount = creditAmount * creditExchangeRate;

		// Get default shipping method (required for StoreOrder)
		const defaultShippingMethod = await sqlClient.shippingMethod.findFirst({
			where: { isDefault: true, isDeleted: false },
		});

		if (!defaultShippingMethod) {
			throw new SafeError("No shipping method available");
		}

		// Validate payment method exists and is enabled for store
		const paymentMethod = await sqlClient.paymentMethod.findUnique({
			where: { id: paymentMethodId },
		});

		if (!paymentMethod) {
			throw new SafeError("Payment method not found");
		}

		if (paymentMethod.isDeleted) {
			throw new SafeError("Payment method is not available");
		}

		// Check if payment method is enabled for this store
		const storePaymentMethodMapping =
			await sqlClient.storePaymentMethodMapping.findUnique({
				where: {
					storeId_methodId: {
						storeId,
						methodId: paymentMethodId,
					},
				},
			});

		// If no mapping exists, check if it's a default payment method
		if (!storePaymentMethodMapping && !paymentMethod.isDefault) {
			throw new SafeError("Payment method is not enabled for this store");
		}

		// Create StoreOrder for recharge
		const now = getUtcNowEpoch();

		// Prepare checkoutAttributes with rsvpId if provided
		const checkoutAttributes = rsvpId
			? JSON.stringify({ rsvpId, creditRecharge: true })
			: JSON.stringify({ creditRecharge: true });

		const order = await sqlClient.storeOrder.create({
			data: {
				storeId,
				userId,
				facilityId: undefined, // Optional field - use undefined instead of null
				isPaid: false,
				orderTotal: new Prisma.Decimal(dollarAmount),
				currency: store.defaultCurrency,
				paymentMethodId: paymentMethod.id, // Use selected payment method ID
				shippingMethodId: defaultShippingMethod.id,
				pickupCode: undefined, // Optional field - use undefined instead of null
				checkoutAttributes,
				createdAt: now,
				updatedAt: now,
				paymentStatus: PaymentStatus.Pending,
				orderStatus: OrderStatus.Pending,
				OrderNotes: {
					create: {
						note: `Credit recharge: ${creditAmount} points (${dollarAmount} ${store.defaultCurrency.toUpperCase()})`,
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
