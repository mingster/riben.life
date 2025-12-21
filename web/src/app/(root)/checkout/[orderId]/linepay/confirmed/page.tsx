"use server";
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
import type { Store, StoreOrder } from "@/types";
import { getAbsoluteUrl } from "@/utils/utils";
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
	const { orderId, transactionId } = await searchParams;
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
					<SuccessAndRedirect orderId={order.id} />
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store;
	const linePayClient = await getLinePayClientByStore(store);

	const confirmRequest = {
		transactionId: transactionId as string,
		body: {
			currency: order.currency as Currency,
			amount: Number(order.orderTotal),
		},
	} as ConfirmRequestConfig;
	//console.log("confirmRequest", JSON.stringify(confirmRequest));

	const res = await linePayClient.confirm.send(confirmRequest);

	if (res.body.returnCode === "0000") {
		// Mark order as paid using the new action
		const checkoutAttributes = order.checkoutAttributes || "";
		const result = await markOrderAsPaidAction({
			orderId: order.id,
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

		redirect(
			`${getAbsoluteUrl()}/checkout/${order.id}/linePay/success`,
		);
	}

	return <></>;
}
