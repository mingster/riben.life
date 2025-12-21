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
		const { storeId, creditAmount, rsvpId } = parsedInput;

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

		// Find Stripe payment method (default for credit recharge)
		const stripePaymentMethod = await sqlClient.paymentMethod.findFirst({
			where: {
				payUrl: "stripe",
				isDeleted: false,
			},
		});

		if (!stripePaymentMethod) {
			throw new SafeError("Stripe payment method not found");
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
				paymentMethodId: stripePaymentMethod.id, // Use Stripe payment method ID
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
