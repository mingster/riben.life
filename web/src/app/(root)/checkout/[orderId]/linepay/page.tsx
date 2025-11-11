import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import {
	type Currency,
	type RequestRequestBody,
	type RequestRequestConfig,
	getLinePayClient,
	getLinePayClientByStore,
} from "@/lib/linePay";
import type { LinePayClient } from "@/lib/linePay/type";
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
const PaymentPage = async (props: { params: Promise<{ orderId: string }> }) => {
	const params = await props.params;
	if (!params.orderId) {
		throw new Error("order Id is missing");
	}
	const headerList = await headers();
	const host = headerList.get("host"); // stackoverflow.com
	//const pathname = headerList.get("x-current-path");
	//console.log("pathname", host, pathname);
	const isMobile = isMobileUserAgent(headerList.get("user-agent"));

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

	const confirmUrl = `${protocol}//${host}/checkout/${order.id}/linePay/confirmed`;
	const cancelUrl = `${protocol}//${host}/checkout/${order.id}/linePay/canceled`;

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

		await sqlClient.storeOrder.update({
			where: {
				id: order.id,
			},
			data: {
				checkoutAttributes: transactionId,
				checkoutRef: paymentAccessToken,
			},
		});

		// for pc user, redirect to web
		// for mobile user, redirect to app
		if (isMobile) {
			redirect(appurl);
		} else {
			redirect(weburl);
		}
	}

	// something wrong
	logger.error("Operation log", {
		tags: ["error"],
	});
	throw new Error(res.body.returnMessage);
};

export default PaymentPage;
