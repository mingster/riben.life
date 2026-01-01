"use server";

import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { OrderStatus, PaymentStatus, StoreLevel } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureCreditRefillProduct } from "./ensure-credit-refill-product";
import { getT } from "@/app/i18n";
import { ensureCustomerIsStoreMember } from "@/utils/store-member-utils";

import { z } from "zod";

export const createRefillCreditPointsOrderSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	creditAmount: z.coerce
		.number()
		.positive("Credit points amount must be positive")
		.min(1, "Credit points amount must be at least 1 point"),
	paymentMethodId: z.string().min(1, "Payment method is required"),
	rsvpId: z.string().optional(),
});

export type CreateRefillCreditPointsOrderInput = z.infer<
	typeof createRefillCreditPointsOrderSchema
>;

/**
 * Create a refill credit points order for customer credit top-up.
 * This creates a StoreOrder that will be paid via selected payment method.
 * After payment is confirmed, processCreditTopUpAfterPayment should be called.
 */
export const createRefillCreditPointsOrderAction = userRequiredActionClient
	.metadata({ name: "createRefillCreditPointsOrder" })
	.schema(createRefillCreditPointsOrderSchema)
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
				level: true,
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

		// Get digital shipping method (required for StoreOrder)
		// Digital shipping is appropriate for credit refill orders
		let shippingMethod = await sqlClient.shippingMethod.findFirst({
			where: { identifier: "digital" },
		});

		if (!shippingMethod) {
			// Fall back to default shipping method if digital is not found
			shippingMethod = await sqlClient.shippingMethod.findFirst({
				where: { isDefault: true, isDeleted: false },
			});

			if (!shippingMethod) {
				throw new SafeError("No shipping method available");
			}
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

		// Validate cash payment is not allowed for Free-tier stores
		// Cash is only available for Pro (2) or Multi (3) level stores
		if (paymentMethod.payUrl === "cash" && store.level === StoreLevel.Free) {
			throw new SafeError("Cash payment is not available for Free-tier stores");
		}

		// Ensure credit refill product exists (create if not found)
		const creditRefillProduct = await ensureCreditRefillProduct(storeId);

		// Get translation function for order note
		const { t } = await getT();

		// Create StoreOrder for refill
		const now = getUtcNowEpoch();

		// Add customer as store member
		await ensureCustomerIsStoreMember(storeId, userId, "user");

		// Prepare checkoutAttributes with rsvpId if provided
		const checkoutAttributes = rsvpId
			? JSON.stringify({ rsvpId, creditRefill: true })
			: JSON.stringify({ creditRefill: true });

		const order = await sqlClient.storeOrder.create({
			data: {
				storeId,
				userId,
				facilityId: undefined, // Optional field - use undefined instead of null
				isPaid: false,
				orderTotal: new Prisma.Decimal(dollarAmount),
				currency: store.defaultCurrency,
				paymentMethodId: paymentMethod.id, // Use selected payment method ID
				shippingMethodId: shippingMethod.id,
				pickupCode: undefined, // Optional field - use undefined instead of null
				checkoutAttributes,
				createdAt: now,
				updatedAt: now,
				paymentStatus: PaymentStatus.Pending,
				orderStatus: OrderStatus.Pending,
				OrderItems: {
					create: {
						productId: creditRefillProduct.id,
						productName: t("store_credit"),
						quantity: creditAmount, // Number of credit points being purchased
						unitPrice: new Prisma.Decimal(creditExchangeRate), // Dollar amount per credit point
						unitDiscount: new Prisma.Decimal(0),
						variants: null,
						variantCosts: null,
					},
				},
				OrderNotes: {
					create: {
						note: t("credit_refill_order_note", {
							creditAmount,
							dollarAmount,
							currency: store.defaultCurrency.toUpperCase(),
						}),
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
