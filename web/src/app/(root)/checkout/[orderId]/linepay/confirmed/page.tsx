import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import {
	type ConfirmRequestConfig,
	type Currency,
	getLinePayClientByStore,
} from "@/lib/linePay";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import logger from "@/lib/logger";

// linePay confirmed page: once user completed the linePay payment, linePay will redirect to this page
// here we check the payment status. Upon success, we mark the order as paid, and then redirect to success page.
// https://developers-pay.line.me/merchant/redirection-pages/
//
export default async function LinePayConfirmedPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const searchParamsData = await searchParams;
	const { orderId, transactionId, returnUrl } = searchParamsData;
	const customReturnUrl = typeof returnUrl === "string" ? returnUrl : undefined;
	//console.log('orderId', orderId, 'transactionId', transactionId);

	if (!orderId) {
		throw new Error("order Id is missing");
	}

	const order = (await getOrderById(orderId as string)) as StoreOrder;
	if (!order) {
		throw new Error("order not found");
	}

	if (order.checkoutAttributes !== transactionId) {
		throw new Error("transactionId not match");
	}

	// call linePay confirm api
	if (order.isPaid) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect order={order} returnUrl={customReturnUrl} />
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store;
	const linePayClient = await getLinePayClientByStore(order.storeId, store);

	if (!linePayClient) {
		throw new Error("LINE Pay client not found");
	}

	// Validate and prepare confirmation request body
	const orderTotal = Number(order.orderTotal);
	if (isNaN(orderTotal) || orderTotal <= 0) {
		logger.error("Invalid order total for LINE Pay confirmation", {
			metadata: {
				orderId: order.id,
				orderTotal: order.orderTotal,
				convertedTotal: orderTotal,
			},
			tags: ["payment", "linepay", "error", "validation"],
		});
		throw new Error("Invalid order total");
	}

	// LINE Pay requires uppercase currency codes
	const currency = (order.currency?.toUpperCase() || "TWD") as Currency;
	const validCurrencies: Currency[] = ["USD", "JPY", "TWD", "THB"];
	if (!validCurrencies.includes(currency)) {
		logger.error("Invalid currency for LINE Pay confirmation", {
			metadata: {
				orderId: order.id,
				currency: order.currency,
				convertedCurrency: currency,
			},
			tags: ["payment", "linepay", "error", "validation"],
		});
		throw new Error(
			`Invalid currency: ${currency}. LINE Pay supports: USD, JPY, TWD, THB`,
		);
	}

	const roundedOrderTotal = Math.round(orderTotal * 100) / 100;

	const confirmRequest: ConfirmRequestConfig = {
		transactionId: transactionId as string,
		body: {
			currency: currency,
			amount: roundedOrderTotal,
		},
	};

	logger.info("LINE Pay confirmation request prepared", {
		metadata: {
			orderId: order.id,
			transactionId: transactionId as string,
			amount: roundedOrderTotal,
			currency: currency,
		},
		tags: ["payment", "linepay", "confirm"],
	});

	const res = await linePayClient.confirm.send(confirmRequest);

	if (res.body.returnCode === "0000") {
		// Find LINE Pay payment method
		const linePayPaymentMethod = await sqlClient.paymentMethod.findFirst({
			where: {
				payUrl: "linePay",
				isDeleted: false,
			},
		});

		if (!linePayPaymentMethod) {
			throw new Error("LINE Pay payment method not found");
		}

		// Mark order as paid using the new action
		const checkoutAttributes = order.checkoutAttributes || "";
		const result = await markOrderAsPaidAction({
			orderId: order.id,
			paymentMethodId: linePayPaymentMethod.id,
			checkoutAttributes,
		});

		if (result?.serverError) {
			logger.error("Failed to mark order as paid", {
				metadata: {
					orderId: order.id,
					error: result.serverError,
				},
				tags: ["error", "payment", "linepay"],
			});
			// Still redirect to success page, but log the error
		} else if (result?.data) {
			logger.info("Order payment processed successfully", {
				metadata: {
					orderId: order.id,
				},
				tags: ["payment", "linepay", "success"],
			});
		}

		if (process.env.NODE_ENV === "development")
			logger.info("LinePayConfirmedPage");

		// Always show success page briefly, then redirect to customReturnUrl if provided
		// Use the updated order from the result if available, otherwise use the original order
		const updatedOrder = result?.data?.order || order;

		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={updatedOrder}
						returnUrl={customReturnUrl}
					/>
				</Container>
			</Suspense>
		);
	}

	// If confirmation failed, redirect to returnUrl with status=failed if provided
	if (customReturnUrl) {
		redirect(`${customReturnUrl}?status=failed`);
	}

	return <></>;
}
