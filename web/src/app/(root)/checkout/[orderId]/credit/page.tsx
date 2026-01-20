import getOrderById from "@/actions/get-order-by_id";
import { markOrderAsPaidCore } from "@/actions/store/order/mark-order-as-paid-core";
import {
	isFiatRefillOrder,
	isCreditRefillOrder,
	isRsvpOrder,
} from "@/actions/store/order/detect-order-type";
import { processFiatTopUpAfterPaymentAction } from "@/actions/store/credit/process-fiat-topup-after-payment";
import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
import { processRsvpAfterPaymentAction } from "@/actions/store/reservation/process-rsvp-after-payment";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getT } from "@/app/i18n";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { StoreOrder } from "@/types";
import logger from "@/lib/logger";
import { CustomerCreditLedgerType } from "@/types/enum";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Credit payment page for checkout.
 * Deducts order total from customer's fiat balance and marks order as paid.
 */
export default async function CreditPaymentPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	if (!params.orderId) {
		throw new Error("Order ID is missing");
	}

	// Fetch order with all relations needed for markOrderAsPaidCore
	const order = (await getOrderById(params.orderId)) as StoreOrder & {
		Store: {
			id: string;
			level: number | null;
			LINE_PAY_ID: string | null;
			STRIPE_SECRET_KEY: string | null;
		};
		PaymentMethod: {
			id: string;
			fee: number | Prisma.Decimal;
			feeAdditional: number | Prisma.Decimal;
			clearDays: number | null;
			name: string | null;
		} | null;
		OrderItemView?: Array<{
			id: string;
			name: string;
		}>;
	};

	if (!order) {
		throw new Error("Order not found");
	}

	// If order is already paid, redirect to success page
	if (order.isPaid) {
		// Determine return URL
		// If returnUrl is null and order is for RSVP, redirect to store's reservation page
		let finalReturnUrl = returnUrl;
		if (!finalReturnUrl) {
			// Check if order is for RSVP (pickupCode starts with "RSVP:")
			const isRsvpOrder = order.pickupCode?.startsWith("RSVP:") ?? false;
			if (isRsvpOrder) {
				finalReturnUrl = `/s/${order.storeId}/reservation`;
			}
		}

		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect order={order} returnUrl={finalReturnUrl} />
				</Container>
			</Suspense>
		);
	}

	// Validate that order has a userId (required for credit payment)
	if (!order.userId) {
		throw new SafeError("Credit payment requires a logged-in user");
	}

	// Get customer credit balance
	const customerCredit = await sqlClient.customerCredit.findUnique({
		where: {
			userId: order.userId,
		},
	});

	const currentBalance = customerCredit ? Number(customerCredit.fiat) : 0;
	const orderTotal = Number(order.orderTotal) || 0;

	// Check if customer has sufficient balance
	if (currentBalance < orderTotal) {
		// Redirect to refill account balance page
		const checkoutUrl = `/checkout/${order.id}/credit${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`;
		const refillUrl = `/s/${order.storeId}/refill-account-balance?returnUrl=${encodeURIComponent(checkoutUrl)}`;
		redirect(refillUrl);
	}

	// Get store for currency
	const store = await sqlClient.store.findUnique({
		where: { id: order.storeId },
		select: {
			level: true,
			defaultCurrency: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// Get translation function
	const { t } = await getT();

	// Calculate new balance after deduction
	const newBalance = currentBalance - orderTotal;

	// Process payment in transaction
	await sqlClient.$transaction(async (tx) => {
		// 1. Update customer fiat balance
		await tx.customerCredit.upsert({
			where: {
				userId: order.userId,
			},
			create: {
				userId: order.userId,
				fiat: new Prisma.Decimal(newBalance),
				point: new Prisma.Decimal(0), // Ensure point is set
				updatedAt: getUtcNowEpoch(),
			},
			update: {
				fiat: new Prisma.Decimal(newBalance),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// 2. Create CustomerFiatLedger entry for payment
		// Build line item names list for the note
		const orderItems: Array<{ id: string; name: string }> =
			(order.OrderItemView as Array<{ id: string; name: string }>) || [];
		const lineItemNames =
			orderItems.length > 0
				? orderItems.map((item) => item.name).join(", ")
				: "";

		// Use different translation key if items are available
		const noteTranslationKey = lineItemNames
			? "order_payment_fiat_note_with_items"
			: "order_payment_fiat_note";

		await tx.customerFiatLedger.create({
			data: {
				storeId: order.storeId,
				userId: order.userId,
				amount: new Prisma.Decimal(-orderTotal), // Negative for payment deduction
				balance: new Prisma.Decimal(newBalance),
				type: CustomerCreditLedgerType.Spend,
				referenceId: order.id, // Link to order
				note: t(noteTranslationKey, {
					items: lineItemNames,
				}),
				creatorId: order.userId, // Customer initiated payment
				createdAt: getUtcNowEpoch(),
			},
		});
	});

	logger.info("Credit payment processed successfully", {
		metadata: {
			orderId: order.id,
			storeId: order.storeId,
			userId: order.userId,
			amount: orderTotal,
			balanceBefore: currentBalance,
			balanceAfter: newBalance,
		},
		tags: ["payment", "credit", "fiat", "success"],
	});

	// 3. Find credit payment method
	const creditPaymentMethod = await sqlClient.paymentMethod.findFirst({
		where: {
			payUrl: "credit",
			isDeleted: false,
		},
	});

	if (!creditPaymentMethod) {
		throw new SafeError("Credit payment method not found");
	}

	// 4. Mark order as paid using markOrderAsPaidCore
	// This will create StoreLedger entry and update order status
	const isPro = store.level === 2 || store.level === 3; // Pro or Multi level
	const updatedOrder = await markOrderAsPaidCore({
		order,
		paymentMethodId: creditPaymentMethod.id,
		isPro,
		logTags: ["credit", "fiat"],
	});

	// 5. Process additional actions based on order type
	// Check for fiat refill order
	const isFiatRefill = await isFiatRefillOrder(order);
	if (isFiatRefill) {
		logger.info("Processing fiat top-up after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "fiat", "credit"],
		});

		const fiatResult = await processFiatTopUpAfterPaymentAction({
			orderId: order.id,
		});

		if (fiatResult?.serverError) {
			logger.error("Failed to process fiat top-up", {
				metadata: {
					orderId: order.id,
					error: fiatResult.serverError,
				},
				tags: ["order", "payment", "fiat", "error", "credit"],
			});
		}
	}

	// Check for credit refill order
	const isCreditRefill = await isCreditRefillOrder(order);
	if (isCreditRefill) {
		logger.info("Processing credit top-up after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "credit", "credit"],
		});

		const creditResult = await processCreditTopUpAfterPaymentAction({
			orderId: order.id,
		});

		if (creditResult?.serverError) {
			logger.error("Failed to process credit top-up", {
				metadata: {
					orderId: order.id,
					error: creditResult.serverError,
				},
				tags: ["order", "payment", "credit", "error", "credit"],
			});
		}
	}

	// Check for RSVP order
	const isRsvp = await isRsvpOrder(order.id);
	if (isRsvp) {
		logger.info("Processing RSVP after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "rsvp", "credit"],
		});

		const rsvpResult = await processRsvpAfterPaymentAction({
			orderId: order.id,
		});

		if (rsvpResult?.serverError) {
			logger.error("Failed to process RSVP", {
				metadata: {
					orderId: order.id,
					error: rsvpResult.serverError,
				},
				tags: ["order", "payment", "rsvp", "error", "credit"],
			});
		}
	}

	// Determine return URL
	// If returnUrl is null and order is for RSVP, redirect to store's reservation page
	let finalReturnUrl = returnUrl;
	if (!finalReturnUrl) {
		// Check if order is for RSVP (pickupCode starts with "RSVP:")
		const isRsvpOrder = order.pickupCode?.startsWith("RSVP:") ?? false;
		if (isRsvpOrder) {
			finalReturnUrl = `/s/${order.storeId}/reservation`;
		}
	}

	// Redirect to success page
	const successUrl = finalReturnUrl
		? `/checkout/${order.id}/success?returnUrl=${encodeURIComponent(finalReturnUrl)}`
		: `/checkout/${order.id}/success`;
	redirect(successUrl);
}
