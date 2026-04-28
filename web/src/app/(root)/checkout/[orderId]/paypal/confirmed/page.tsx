import { notFound } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	capturePayPalOrder,
	getPayPalCredentialsByStore,
} from "@/lib/payment/paypal";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { Store, StoreOrder } from "@/types";

export default async function PayPalConfirmedPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const { orderId } = params;
	if (!orderId) {
		throw new Error("Order ID is missing");
	}

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	// PayPal passes the order token (= PayPal order ID) as `token`
	const token =
		typeof searchParams.token === "string" ? searchParams.token : undefined;
	if (!token) {
		throw new Error("PayPal token is missing");
	}

	const order = (await getOrderById(orderId)) as StoreOrder | null;
	if (!order) {
		notFound();
	}

	if (order.isPaid) {
		const { rsvp } = await getPostPaymentSignInProps(order.id);
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={order}
						returnUrl={returnUrl}
						rsvp={rsvp}
					/>
				</Container>
			</Suspense>
		);
	}

	if (order.checkoutRef !== token) {
		logger.error("PayPal token mismatch", {
			metadata: { orderId, token, checkoutRef: order.checkoutRef },
			tags: ["payment", "paypal", "error"],
		});
		throw new Error("PayPal order mismatch");
	}

	const store = (await getStoreById(order.storeId)) as Store | null;
	if (!store) {
		notFound();
	}

	const creds = await getPayPalCredentialsByStore(order.storeId, store);
	if (!creds) {
		throw new Error("PayPal is not configured for this store");
	}

	const captured = await capturePayPalOrder(
		creds.clientId,
		creds.clientSecret,
		token,
	);

	if ("error" in captured) {
		logger.error("PayPal capture failed", {
			metadata: { orderId, token, error: captured.error },
			tags: ["payment", "paypal", "error"],
		});
		throw new Error(captured.error);
	}

	const paypalMethod = await sqlClient.paymentMethod.findFirst({
		where: { payUrl: "paypal", isDeleted: false },
	});
	if (!paypalMethod) {
		throw new Error("PayPal payment method not found");
	}

	const result = await markOrderAsPaidAction({
		orderId: order.id,
		paymentMethodId: paypalMethod.id,
		checkoutAttributes: captured.captureId,
	});

	if (result?.serverError) {
		logger.error("Failed to mark PayPal order as paid", {
			metadata: { orderId, error: result.serverError },
			tags: ["payment", "paypal", "error"],
		});
	} else {
		logger.info("PayPal payment confirmed", {
			metadata: { orderId, captureId: captured.captureId },
			tags: ["payment", "paypal", "success"],
		});
	}

	const updatedOrder = (result?.data?.order as StoreOrder | undefined) || order;
	const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
		updatedOrder.id,
		{ issueSignInToken: true },
	);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect
					order={updatedOrder}
					returnUrl={returnUrl}
					rsvp={rsvp}
					postPaymentSignInToken={postPaymentSignInToken}
				/>
			</Container>
		</Suspense>
	);
}
