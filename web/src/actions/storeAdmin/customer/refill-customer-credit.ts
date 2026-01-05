"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { processCreditTopUp } from "@/lib/credit-bonus";
import { refillCustomerCreditSchema } from "./refill-customer-credit.validation";
import { OrderStatus, PaymentStatus, StoreLedgerType } from "@/types/enum";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";

export const refillCustomerCreditAction = storeActionClient
	.metadata({ name: "refillCustomerCredit" })
	.schema(refillCustomerCreditSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { userId, creditAmount, cashAmount, isPaid, note } = parsedInput;

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
					paidDate: getUtcNowEpoch(),
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
			orderId = order.id;
		}

		// Get translation function for default notes
		const { t } = await getT();

		// Process credit top-up using the shared function
		const result = await processCreditTopUp(
			storeId,
			userId,
			creditAmount,
			orderId, // Order ID if paid, null if promotional
			creatorId, // Store operator who created this
			note ||
				(isPaid
					? t("in_person_cash_refill_default_note")
					: t("promotional_refill_by_operator_default_note")),
		);

		// Create StoreLedger entry
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);

		if (isPaid && cashAmount && cashAmount > 0) {
			// Paid in person: create StoreLedger entry with cash amount
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
					description: t("in_person_credit_refill_description_ledger", {
						totalCredit: result.totalCredit,
					}),
					note: note
						? t("in_person_credit_refill_note_with_extra", {
								cashAmount,
								currency: store.defaultCurrency.toUpperCase(),
								amount: result.amount,
								bonus: result.bonus,
								totalCredit: result.totalCredit,
								operator: creatorId,
								note,
							})
						: t("in_person_credit_refill_note_ledger", {
								cashAmount,
								currency: store.defaultCurrency.toUpperCase(),
								amount: result.amount,
								bonus: result.bonus,
								totalCredit: result.totalCredit,
								operator: creatorId,
							}),
					createdBy: creatorId, // Store operator who created this ledger entry
					availability: getUtcNowEpoch(), // Immediate for cash
					createdAt: getUtcNowEpoch(),
				},
			});
		} else {
			// Promotional refill: create a minimal system order for StoreLedger reference
			//
			const promoPaymentMethod = await sqlClient.paymentMethod.findFirst({
				where: {
					payUrl: "promo",
					isDeleted: false,
				},
			});

			if (!promoPaymentMethod) {
				throw new SafeError("Promo payment method not found");
			}

			const systemOrder = await sqlClient.storeOrder.create({
				data: {
					storeId,
					userId,
					orderTotal: new Prisma.Decimal(0), // Zero amount for promotional
					currency: store.defaultCurrency,
					paymentMethodId: promoPaymentMethod.id, // Special payment method
					shippingMethodId,
					orderStatus: OrderStatus.Confirmed,
					paymentStatus: PaymentStatus.Paid,
					isPaid: true,
					paidDate: getUtcNowEpoch(),
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
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
					description: t("refill_credit_description_ledger", {
						totalCredit: result.totalCredit,
					}),
					note: note
						? t("refill_credit_note_with_extra", {
								amount: result.amount,
								bonus: result.bonus,
								totalCredit: result.totalCredit,
								operator: creatorId,
								note,
							})
						: t("refill_credit_note_ledger", {
								amount: result.amount,
								bonus: result.bonus,
								totalCredit: result.totalCredit,
								operator: creatorId,
							}),
					createdBy: creatorId, // Store operator who created this ledger entry
					availability: getUtcNowEpoch(),
					createdAt: getUtcNowEpoch(),
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
