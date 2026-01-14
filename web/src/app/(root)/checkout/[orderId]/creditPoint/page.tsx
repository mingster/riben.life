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
import logger from "@/lib/logger";
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
import { CustomerCreditLedgerType } from "@/types/enum";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Credit points payment page for checkout.
 * Deducts order total from customer's credit points balance and marks order as paid.
 */
export default async function CreditPointPaymentPage(props: {
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
			creditExchangeRate: number | Prisma.Decimal | null;
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

	// Validate that order has a userId (required for credit points payment)
	if (!order.userId) {
		throw new SafeError("Credit points payment requires a logged-in user");
	}

	// Get store for credit exchange rate
	const store = await sqlClient.store.findUnique({
		where: { id: order.storeId },
		select: {
			level: true,
			defaultCurrency: true,
			creditExchangeRate: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// Get credit exchange rate
	const creditExchangeRate = Number(store.creditExchangeRate) || 1;
	if (creditExchangeRate <= 0) {
		throw new SafeError("Credit exchange rate is not configured");
	}

	// Get customer credit balance (points)
	const customerCredit = await sqlClient.customerCredit.findUnique({
		where: {
			userId: order.userId,
		},
	});

	const orderTotal = Number(order.orderTotal) || 0;
	// Convert order total (in currency) to credit points
	const requiredCreditPoints = orderTotal / creditExchangeRate;
	const currentBalance = customerCredit ? Number(customerCredit.point) : 0;

	// Check if customer has sufficient balance
	if (currentBalance < requiredCreditPoints) {
		// Redirect to refill credit points page
		const checkoutUrl = `/checkout/${order.id}/creditPoint${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`;
		const refillUrl = `/s/${order.storeId}/refill-credit-points?returnUrl=${encodeURIComponent(checkoutUrl)}`;
		redirect(refillUrl);
	}

	// Get translation function
	const { t } = await getT();

	// Calculate new balance after deduction
	const newBalance = currentBalance - requiredCreditPoints;

	// Process payment in transaction
	await sqlClient.$transaction(async (tx) => {
		// 1. Update customer credit points balance
		await tx.customerCredit.upsert({
			where: {
				userId: order.userId,
			},
			create: {
				userId: order.userId,
				point: new Prisma.Decimal(newBalance),
				fiat: new Prisma.Decimal(0), // Ensure fiat is set
				updatedAt: getUtcNowEpoch(),
			},
			update: {
				point: new Prisma.Decimal(newBalance),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// 2. Create CustomerCreditLedger entry for payment
		await tx.customerCreditLedger.create({
			data: {
				storeId: order.storeId,
				userId: order.userId,
				amount: new Prisma.Decimal(-requiredCreditPoints), // Negative for payment deduction
				balance: new Prisma.Decimal(newBalance),
				type: CustomerCreditLedgerType.Spend, // Credit points payment
				referenceId: order.id, // Link to order
				note:
					t("order_payment_credit_point_note", {
						orderId: order.id,
						points: requiredCreditPoints,
						amount: orderTotal,
						currency: (store.defaultCurrency || "twd").toUpperCase(),
					}) || `Order payment: ${order.id} (${requiredCreditPoints} points)`,
				creatorId: order.userId, // Customer initiated payment
				createdAt: getUtcNowEpoch(),
			},
		});
	});

	logger.info("Credit points payment processed successfully", {
		metadata: {
			orderId: order.id,
			storeId: order.storeId,
			userId: order.userId,
			amount: orderTotal,
			creditPoints: requiredCreditPoints,
			balanceBefore: currentBalance,
			balanceAfter: newBalance,
			creditExchangeRate,
		},
		tags: ["payment", "credit", "points", "success"],
	});

	// 3. Find credit points payment method
	// Try "creditPoint" first, fall back to "credit" if not found
	let creditPointPaymentMethod = await sqlClient.paymentMethod.findFirst({
		where: {
			payUrl: "creditPoint",
			isDeleted: false,
		},
	});

	// If not found, try "credit" as fallback
	if (!creditPointPaymentMethod) {
		creditPointPaymentMethod = await sqlClient.paymentMethod.findFirst({
			where: {
				payUrl: "credit",
				isDeleted: false,
			},
		});
	}

	if (!creditPointPaymentMethod) {
		throw new SafeError("Credit points payment method not found");
	}

	// 4. Mark order as paid using markOrderAsPaidCore
	// This will create StoreLedger entry and update order status
	const isPro = store.level === 2 || store.level === 3; // Pro or Multi level
	const updatedOrder = await markOrderAsPaidCore({
		order,
		paymentMethodId: creditPointPaymentMethod.id,
		isPro,
		logTags: ["credit", "points"],
	});

	// 5. Process additional actions based on order type
	// Check for fiat refill order
	const isFiatRefill = await isFiatRefillOrder(order);
	if (isFiatRefill) {
		logger.info("Processing fiat top-up after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "fiat", "credit-point"],
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
				tags: ["order", "payment", "fiat", "error", "credit-point"],
			});
		}
	}

	// Check for credit refill order
	const isCreditRefill = await isCreditRefillOrder(order);
	if (isCreditRefill) {
		logger.info("Processing credit top-up after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "credit", "credit-point"],
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
				tags: ["order", "payment", "credit", "error", "credit-point"],
			});
		}
	}

	// Check for RSVP order
	const isRsvp = await isRsvpOrder(order.id);
	if (isRsvp) {
		logger.info("Processing RSVP after marking order as paid", {
			metadata: { orderId: order.id },
			tags: ["order", "payment", "rsvp", "credit-point"],
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
				tags: ["order", "payment", "rsvp", "error", "credit-point"],
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
