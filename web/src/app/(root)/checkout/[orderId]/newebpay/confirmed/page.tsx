import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import { markOrderAsPaidAction } from "@/actions/store/order/mark-order-as-paid";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	getNewebPayCredentialsByStore,
	parseAndVerifyNewebPayResult,
	parseNewebPayCallbackEnvelope,
} from "@/lib/payment/newebpay";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { StoreOrder } from "@/types";

function toSingleQueryValue(
	value: string | string[] | undefined,
): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value) && value.length > 0) {
		return value[0];
	}
	return undefined;
}

export default async function NewebPayConfirmedPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const customReturnUrl = toSingleQueryValue(searchParams.returnUrl);

	const order = (await getOrderById(params.orderId)) as StoreOrder | null;
	if (!order) {
		notFound();
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

	const Status = toSingleQueryValue(searchParams.Status);
	const MerchantID = toSingleQueryValue(searchParams.MerchantID);
	const TradeInfo = toSingleQueryValue(searchParams.TradeInfo);
	const TradeSha = toSingleQueryValue(searchParams.TradeSha);
	const Version = toSingleQueryValue(searchParams.Version);
	if (!Status || !MerchantID || !TradeInfo || !TradeSha || !Version) {
		throw new Error("Missing NewebPay callback data.");
	}

	const credentials = await getNewebPayCredentialsByStore(order.storeId);
	if (!credentials) {
		throw new Error("NewebPay credentials are missing.");
	}

	const envelope = parseNewebPayCallbackEnvelope({
		Status,
		MerchantID,
		TradeInfo,
		TradeSha,
		Version,
	});
	const verifiedResult = parseAndVerifyNewebPayResult({
		envelope,
		credentials,
	});

	const merchantOrderNo = String(verifiedResult.MerchantOrderNo ?? "");
	const paidAmount = Number(verifiedResult.Amt ?? 0);
	const expectedAmount = Number(order.orderTotal);
	if (!merchantOrderNo || merchantOrderNo !== order.checkoutRef) {
		throw new Error("NewebPay merchant order number mismatch.");
	}
	if (paidAmount !== expectedAmount) {
		throw new Error("NewebPay paid amount mismatch.");
	}

	const paymentMethod = await sqlClient.paymentMethod.findFirst({
		where: {
			payUrl: { equals: "newebpay", mode: "insensitive" },
			isDeleted: false,
		},
	});
	if (!paymentMethod) {
		throw new Error("NewebPay payment method not found.");
	}

	const markResult = await markOrderAsPaidAction({
		orderId: order.id,
		paymentMethodId: paymentMethod.id,
		checkoutAttributes: JSON.stringify({
			tradeNo: verifiedResult.TradeNo ?? "",
			merchantOrderNo,
			paymentType: verifiedResult.PaymentType ?? "",
		}),
	});

	if (markResult?.serverError) {
		logger.error("Failed to mark NewebPay order as paid", {
			metadata: {
				orderId: order.id,
				error: markResult.serverError,
			},
			tags: ["payment", "newebpay", "error"],
		});
		throw new Error(markResult.serverError);
	}

	const updatedOrder = (markResult?.data?.order as StoreOrder | undefined) || order;
	const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
		updatedOrder.id,
	);

	if (customReturnUrl && !updatedOrder.isPaid) {
		redirect(`${customReturnUrl}?status=failed`);
	}

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
