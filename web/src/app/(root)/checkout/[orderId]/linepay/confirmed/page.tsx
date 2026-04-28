import { redirect } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	type ConfirmRequestConfig,
	type Currency,
	getLinePayClientByStore,
} from "@/lib/payment/linePay";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { Store, StoreOrder } from "@/types";

export default async function LinePayConfirmedPage({
	params,
	searchParams,
}: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { orderId: orderIdParam } = await params;
	const searchParamsData = await searchParams;
	const { transactionId: transactionIdParam, returnUrl: returnUrlRaw } =
		searchParamsData;
	const customReturnUrl =
		typeof returnUrlRaw === "string" ? returnUrlRaw : undefined;

	if (!orderIdParam) {
		throw new Error("order Id is missing");
	}

	const transactionIdStr = Array.isArray(transactionIdParam)
		? transactionIdParam[0]
		: typeof transactionIdParam === "string"
			? transactionIdParam
			: undefined;
	if (!transactionIdStr) {
		throw new Error("transactionId is missing");
	}

	const order = (await getOrderById(orderIdParam)) as StoreOrder;
	if (!order) {
		throw new Error("order not found");
	}

	if (order.checkoutAttributes !== transactionIdStr) {
		throw new Error("transactionId not match");
	}

	if (order.isPaid) {
		const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
			order.id,
		);
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={order}
						returnUrl={customReturnUrl}
						rsvp={rsvp}
						postPaymentSignInToken={postPaymentSignInToken}
					/>
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store;
	const linePayClient = await getLinePayClientByStore(order.storeId, store);

	if (!linePayClient) {
		throw new Error("LINE Pay client not found");
	}

	const orderTotal = Number(order.orderTotal);
	if (Number.isNaN(orderTotal) || orderTotal <= 0) {
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
		transactionId: transactionIdStr,
		body: {
			currency: currency,
			amount: roundedOrderTotal,
		},
	};

	logger.info("LINE Pay confirmation request prepared", {
		metadata: {
			orderId: order.id,
			transactionId: transactionIdStr,
			amount: roundedOrderTotal,
			currency: currency,
		},
		tags: ["payment", "linepay", "confirm"],
	});

	const res = await linePayClient.confirm.send(confirmRequest);

	if (res.body.returnCode === "0000") {
		const linePayPaymentMethod = await sqlClient.paymentMethod.findFirst({
			where: {
				payUrl: "linepay",
				isDeleted: false,
			},
		});

		if (!linePayPaymentMethod) {
			throw new Error("LINE Pay payment method not found");
		}

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
		} else if (result?.data) {
			logger.info("Order payment processed successfully", {
				metadata: {
					orderId: order.id,
				},
				tags: ["payment", "linepay", "success"],
			});
		}

		const updatedOrder =
			(result?.data?.order as StoreOrder | undefined) || order;
		const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
			updatedOrder.id,
		);

		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={updatedOrder}
						returnUrl={customReturnUrl}
						rsvp={rsvp}
						postPaymentSignInToken={postPaymentSignInToken}
					/>
				</Container>
			</Suspense>
		);
	}

	if (customReturnUrl) {
		redirect(`${customReturnUrl}?status=failed`);
	}

	return <></>;
}
