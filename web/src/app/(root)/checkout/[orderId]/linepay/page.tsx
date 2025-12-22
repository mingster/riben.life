import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import {
	type Currency,
	type RequestRequestBody,
	type RequestRequestConfig,
	getLinePayClientByStore,
} from "@/lib/linePay";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { isMobileUserAgent } from "@/utils/utils";
import type { orderitemview } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import logger from "@/lib/logger";

// customer select linePay as payment method. here we will make a payment request
// and redirect user to linePay payment page
//
// https://developers-pay.line.me/online
// https://developers-pay.line.me/online-api
// https://developers-pay.line.me/online/implement-basic-payment#confirm
const PaymentPage = async (props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
	const params = await props.params;
	const searchParams = await props.searchParams;
	if (!params.orderId) {
		throw new Error("order Id is missing");
	}
	const headerList = await headers();
	const host = headerList.get("host"); // stackoverflow.com
	//const pathname = headerList.get("x-current-path");
	//console.log("pathname", host, pathname);
	const isMobile = isMobileUserAgent(headerList.get("user-agent"));

	// Extract returnUrl from search params
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	//console.log('orderId: ' + params.orderId);

	const order = (await getOrderById(params.orderId)) as StoreOrder;

	if (!order) {
		throw new Error("order not found");
	}
	//console.log('linePay order', JSON.stringify(order));

	if (order.isPaid === true) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect orderId={order.id} />
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store;
	const linePayClient = await getLinePayClientByStore(store);

	const env =
		process.env.NODE_ENV === "development" ? "development" : "production";

	let protocol = "http:";
	if (env === "production") {
		protocol = "https:";
	}

	// Include returnUrl in confirmed and canceled URLs if provided
	const confirmUrlBase = `${protocol}//${host}/checkout/${order.id}/linePay/confirmed`;
	const cancelUrlBase = `${protocol}//${host}/checkout/${order.id}/linePay/canceled`;
	const confirmUrl = returnUrl
		? `${confirmUrlBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: confirmUrlBase;
	const cancelUrl = returnUrl
		? `${cancelUrlBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: cancelUrlBase;

	const requestBody: RequestRequestBody = {
		amount: Number(order.orderTotal),
		currency: order.currency as Currency,
		orderId: order.id,
		packages: order.OrderItemView.map((item: orderitemview) => ({
			id: item.id,
			amount: Number(item.unitPrice) * item.quantity,
			products: [
				{
					name: item.name,
					quantity: item.quantity,
					price: Number(item.unitPrice),
				},
			],
		})),
		redirectUrls: {
			confirmUrl: confirmUrl,
			cancelUrl: cancelUrl,
		},
	};

	//console.log("linePay request", JSON.stringify(requestBody));

	const requestConfig: RequestRequestConfig = {
		body: requestBody,
	};

	const res = await linePayClient.request.send(requestConfig);
	//console.log("linePay res", JSON.stringify(res));

	if (res.body.returnCode === "0000") {
		const weburl = res.body.info.paymentUrl.web;
		const appurl = res.body.info.paymentUrl.app;
		const transactionId = res.body.info.transactionId;
		const paymentAccessToken = res.body.info.paymentAccessToken;

		// Store transaction ID and payment access token for confirmation
		await sqlClient.storeOrder.update({
			where: {
				id: order.id,
			},
			data: {
				checkoutAttributes: transactionId,
				checkoutRef: paymentAccessToken,
			},
		});

		logger.info("LINE Pay payment request created", {
			metadata: {
				orderId: order.id,
				transactionId,
				amount: Number(order.orderTotal),
				currency: order.currency,
			},
			tags: ["payment", "linepay", "success"],
		});

		// for pc user, redirect to web
		// for mobile user, redirect to app
		if (isMobile) {
			redirect(appurl);
		} else {
			redirect(weburl);
		}
	}

	// LINE Pay request failed
	logger.error("LINE Pay payment request failed", {
		metadata: {
			orderId: order.id,
			returnCode: res.body.returnCode,
			returnMessage: res.body.returnMessage,
		},
		tags: ["payment", "linepay", "error"],
	});
	throw new Error(res.body.returnMessage || "LINE Pay payment request failed");
};

export default PaymentPage;
