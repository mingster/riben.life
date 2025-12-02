"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { processCreditTopUp } from "@/lib/credit-bonus";
import { rechargeCustomerCreditSchema } from "./recharge-customer-credit.validation";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { Prisma } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";

export const rechargeCustomerCreditAction = storeActionClient
	.metadata({ name: "rechargeCustomerCredit" })
	.schema(rechargeCustomerCreditSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { userId, creditAmount, cashAmount, isPaid, note } = parsedInput;

		// Get the current user (store operator) who is creating this recharge
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const creatorId = session?.user?.id;

		if (typeof creatorId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Verify customer exists
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
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

		// Get shipping method with identifier "takeout" for the order (required field)
		let shippingMethodId: string;

		// First, try to find "takeout" in store's shipping methods
		const takeoutMethod = store.StoreShippingMethods.find(
			(mapping) => mapping.ShippingMethod.identifier === "takeout",
		);

		if (takeoutMethod) {
			shippingMethodId = takeoutMethod.ShippingMethod.id;
		} else {
			// If not found in store's methods, try to find it directly
			const takeoutShippingMethod = await sqlClient.shippingMethod.findFirst({
				where: {
					identifier: "takeout",
					isDeleted: false,
				},
			});

			if (takeoutShippingMethod) {
				shippingMethodId = takeoutShippingMethod.id;
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

		// If paid recharge, create StoreOrder first
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

			const order = await sqlClient.storeOrder.create({
				data: {
					storeId,
					userId,
					orderTotal: new Prisma.Decimal(cashAmount),
					currency: store.defaultCurrency,
					paymentMethodId: cashPaymentMethod.id, // Use cash payment method ID
					shippingMethodId,
					orderStatus: OrderStatus.Confirmed,
					paymentStatus: PaymentStatus.Paid,
					isPaid: true,
					paidDate: getUtcNow(),
					createdAt: getUtcNow(),
					updatedAt: getUtcNow(),
				},
			});
			orderId = order.id;
		}

		// Process credit top-up using the shared function
		const result = await processCreditTopUp(
			storeId,
			userId,
			creditAmount,
			orderId, // Order ID if paid, null if promotional
			creatorId, // Store operator who created this
			note ||
				(isPaid
					? `In-person cash recharge`
					: `Promotional recharge by operator`),
		);

		// Create StoreLedger entry
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);

		if (isPaid && cashAmount && cashAmount > 0) {
			// Paid recharge: create StoreLedger entry with cash amount
			await sqlClient.storeLedger.create({
				data: {
					storeId,
					orderId: orderId!, // Order ID is guaranteed to exist here
					amount: new Prisma.Decimal(cashAmount), // Cash amount received
					fee: new Prisma.Decimal(0), // No payment processing fee for cash
					platformFee: new Prisma.Decimal(0), // No platform fee for cash
					currency: store.defaultCurrency,
					type: StoreLedgerType.CreditRecharge,
					balance: new Prisma.Decimal(balance + Number(cashAmount)), // Balance increases
					description: `In-Person Credit Recharge - ${result.totalCredit} points`,
					note: `Cash payment: ${cashAmount} ${store.defaultCurrency}. Credit given: ${result.amount} + bonus ${result.bonus} = ${result.totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
					createdBy: creatorId, // Store operator who created this ledger entry
					availability: getUtcNow(), // Immediate for cash
					createdAt: getUtcNow(),
				},
			});
		} else {
			// Promotional recharge: create a minimal system order for StoreLedger reference
			// Note: According to design doc 3.2, orderId should be null for promotional recharge,
			// but StoreLedger schema requires orderId. Creating minimal order as workaround.
			// TODO: Update StoreLedger schema to make orderId nullable
			const systemOrder = await sqlClient.storeOrder.create({
				data: {
					storeId,
					userId,
					orderTotal: new Prisma.Decimal(0), // Zero amount for promotional
					currency: store.defaultCurrency,
					paymentMethodId: "promotional_credit", // Special payment method
					shippingMethodId,
					orderStatus: OrderStatus.Confirmed,
					paymentStatus: PaymentStatus.Paid,
					isPaid: true,
					paidDate: getUtcNow(),
					createdAt: getUtcNow(),
					updatedAt: getUtcNow(),
				},
			});

			// Create StoreLedger entry with amount = 0
			await sqlClient.storeLedger.create({
				data: {
					storeId,
					orderId: systemOrder.id,
					amount: new Prisma.Decimal(0), // Zero amount - no cash transaction
					fee: new Prisma.Decimal(0),
					platformFee: new Prisma.Decimal(0),
					currency: store.defaultCurrency,
					type: StoreLedgerType.CreditRecharge,
					balance: new Prisma.Decimal(balance), // Balance unchanged
					description: `Promotional Credit Recharge - ${result.totalCredit} points`,
					note: `Promotional credit: ${result.amount} + bonus ${result.bonus} = ${result.totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
					createdBy: creatorId, // Store operator who created this ledger entry
					availability: getUtcNow(),
					createdAt: getUtcNow(),
				},
			});
		}

		return {
			success: true,
			amount: result.amount,
			bonus: result.bonus,
			totalCredit: result.totalCredit,
			orderId: orderId, // Return order ID if created
		};
	});
