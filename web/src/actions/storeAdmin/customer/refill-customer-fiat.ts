"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { processFiatTopUp } from "@/lib/credit-bonus";
import { refillCustomerFiatSchema } from "./refill-customer-fiat.validation";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

export const refillCustomerFiatAction = storeActionClient
	.metadata({ name: "refillCustomerFiat" })
	.schema(refillCustomerFiatSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { userId, fiatAmount, cashAmount, isPaid, note } = parsedInput;

		// Get the current user (store operator) who is creating this refill
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const creatorId = session?.user?.id;

		if (typeof creatorId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Verify customer exists
		const customer = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!customer) {
			throw new SafeError("Customer not found");
		}

		// Get store info
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				defaultCurrency: true,
				defaultTimezone: true,
				StoreShippingMethods: {
					include: {
						ShippingMethod: {
							select: {
								id: true,
								identifier: true,
							},
						},
					},
				},
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Get shipping method with identifier "digital" for the order (required field)
		let shippingMethodId: string;

		// First, try to find "digital" in store's shipping methods
		const digitalMethod = store.StoreShippingMethods.find(
			(mapping) => mapping.ShippingMethod.identifier === "digital",
		);

		if (digitalMethod) {
			shippingMethodId = digitalMethod.ShippingMethod.id;
		} else {
			// If not found in store's methods, try to find it directly
			const digitalShippingMethod = await sqlClient.shippingMethod.findFirst({
				where: {
					identifier: "digital",
					isDeleted: false,
				},
			});

			if (digitalShippingMethod) {
				shippingMethodId = digitalShippingMethod.id;
			} else {
				// Fall back to default shipping method
				const defaultShippingMethod = await sqlClient.shippingMethod.findFirst({
					where: { isDefault: true, isDeleted: false },
				});
				if (!defaultShippingMethod) {
					throw new SafeError("No shipping method available");
				}
				shippingMethodId = defaultShippingMethod.id;
			}
		}

		let orderId: string | null = null;

		// If paid in cash, create StoreOrder first
		if (isPaid && cashAmount && cashAmount > 0) {
			// Find the cash payment method by payUrl
			const cashPaymentMethod = await sqlClient.paymentMethod.findFirst({
				where: {
					payUrl: "cash",
					isDeleted: false,
				},
			});

			if (!cashPaymentMethod) {
				throw new SafeError("Cash payment method not found");
			}

			// Set checkoutAttributes to identify this as a fiat refill order
			const checkoutAttributes = JSON.stringify({ fiatRefill: true });

			const order = await sqlClient.storeOrder.create({
				data: {
					storeId,
					userId,
					orderTotal: new Prisma.Decimal(cashAmount),
					currency: store.defaultCurrency,
					paymentMethodId: cashPaymentMethod.id, // Use cash payment method ID
					shippingMethodId,
					checkoutAttributes,
					orderStatus: OrderStatus.Confirmed,
					paymentStatus: PaymentStatus.Paid,
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
			orderId = order.id;
		}

		// Get translation function for default notes
		const { t } = await getT();

		// Process fiat top-up using the shared function
		const result = await processFiatTopUp(
			storeId,
			userId,
			fiatAmount,
			orderId, // Order ID if paid, null if promotional
			creatorId, // Store operator who created this
			note ||
				(isPaid
					? t("in_person_cash_refill_default_note")
					: t("promotional_refill_by_operator_default_note")),
		);

		// No StoreLedger entry is created for customer credit refills

		return {
			success: true,
			amount: result.amount,
			orderId: orderId, // Return order ID if created
		};
	});
