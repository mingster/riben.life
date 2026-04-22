import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	createPayPalOrder,
	formatPayPalAmountValue,
	getPayPalCredentialsByStore,
} from "@/lib/payment/paypal";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";

export default async function PayPalPaymentPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	if (!params.orderId) {
		throw new Error("Order ID is missing");
	}

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	const order = (await getOrderById(params.orderId)) as StoreOrder | null;
	if (!order) {
		notFound();
	}

	if (order.isPaid) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect order={order} returnUrl={returnUrl} />
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store | null;
	if (!store) {
		notFound();
	}

	const creds = await getPayPalCredentialsByStore(order.storeId, store);
	if (!creds) {
		logger.error("PayPal not configured for store", {
			metadata: { orderId: order.id, storeId: order.storeId },
			tags: ["payment", "paypal", "error"],
		});
		throw new Error("PayPal is not configured for this store");
	}

	const headerList = await headers();
	const host = headerList.get("host");
	const protocol = process.env.NODE_ENV === "development" ? "http:" : "https:";

	const confirmedBase = `${protocol}//${host}/checkout/${order.id}/paypal/confirmed`;
	const cancelBase = `${protocol}//${host}/checkout/${order.id}`;
	const confirmedUrl = returnUrl
		? `${confirmedBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: confirmedBase;
	const cancelUrl = returnUrl
		? `${cancelBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: cancelBase;

	const amountValue = formatPayPalAmountValue(
		Number(order.orderTotal),
		order.currency,
	);

	const result = await createPayPalOrder({
		clientId: creds.clientId,
		clientSecret: creds.clientSecret,
		amountValue,
		currencyCode: order.currency,
		returnUrl: confirmedUrl,
		cancelUrl,
		customId: order.id,
		description: `Order #${order.orderNum ?? order.id}`,
	});

	if ("error" in result) {
		logger.error("PayPal order creation failed", {
			metadata: { orderId: order.id, error: result.error },
			tags: ["payment", "paypal", "error"],
		});
		throw new Error(result.error);
	}

	await sqlClient.storeOrder.update({
		where: { id: order.id },
		data: { checkoutRef: result.orderId },
	});

	logger.info("PayPal order created, redirecting", {
		metadata: { orderId: order.id, paypalOrderId: result.orderId },
		tags: ["payment", "paypal"],
	});

	redirect(result.approvalUrl);
}
