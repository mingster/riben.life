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
import { ensureFiatRefillProduct } from "./ensure-fiat-refill-product";
import { getT } from "@/app/i18n";
import { ensureCustomerIsStoreMember } from "@/utils/store-member-utils";

import { createRefillAccountBalanceOrderSchema } from "./create-refill-account-balance-order.validation";

/**
 * Create a refill account balance order for customer fiat top-up.
 * This creates a StoreOrder that will be paid via selected payment method.
 * After payment is confirmed, processFiatTopUpAfterPayment should be called.
 */
export const createRefillAccountBalanceOrderAction = userRequiredActionClient
	.metadata({ name: "createRefillAccountBalanceOrder" })
	.schema(createRefillAccountBalanceOrderSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, fiatAmount, paymentMethodId, rsvpId } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Get store
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				defaultCurrency: true,
				level: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Get digital shipping method (required for StoreOrder)
		// Digital shipping is appropriate for fiat refill orders
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

		// Ensure fiat refill product exists (create if not found)
		const fiatRefillProduct = await ensureFiatRefillProduct(storeId);

		// Get translation function for order note
		const { t } = await getT();

		// Create StoreOrder for refill
		const now = getUtcNowEpoch();

		// Add customer as store member
		await ensureCustomerIsStoreMember(storeId, userId, "user");

		// Prepare checkoutAttributes with rsvpId if provided and valid
		// Always include fiatRefill: true to identify this as a fiat refill order
		const checkoutAttributes =
			rsvpId && rsvpId.trim()
				? JSON.stringify({ rsvpId, fiatRefill: true })
				: JSON.stringify({ fiatRefill: true });

		const order = await sqlClient.storeOrder.create({
			data: {
				storeId,
				userId,
				facilityId: undefined, // Optional field - use undefined instead of null
				isPaid: false,
				orderTotal: new Prisma.Decimal(fiatAmount), // Fiat amount is the order total
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
						productId: fiatRefillProduct.id,
						productName:
							t("refill_account_balance") || "Refill Account Balance",
						quantity: 1, // Single item for fiat refill
						unitPrice: new Prisma.Decimal(fiatAmount), // Fiat amount is the unit price
						unitDiscount: new Prisma.Decimal(0),
						variants: null,
						variantCosts: null,
					},
				},
				OrderNotes: {
					create: {
						note: t("refill_account_balance_order_note", {
							fiatAmount,
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
