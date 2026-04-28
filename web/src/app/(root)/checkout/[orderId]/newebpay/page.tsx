import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	buildNewebPayMpgFormPayload,
	getNewebPayCredentialsByStore,
	getNewebPayMpgGatewayBaseUrl,
	NEWEBPAY_MPG_VERSION,
} from "@/lib/payment/newebpay";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { StoreOrder } from "@/types";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

function createMerchantOrderNo(orderId: string): string {
	return `SO${orderId.replaceAll("-", "").slice(0, 28)}`;
}

function toProtocol(host: string | null): string {
	if (process.env.NODE_ENV === "production") {
		return "https";
	}
	if (host?.includes("localhost")) {
		return "http";
	}
	return "https";
}

export default async function NewebPayPaymentPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const returnUrl =
		typeof searchParams.returnUrl === "string" ? searchParams.returnUrl : undefined;

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
						returnUrl={returnUrl}
						rsvp={rsvp}
						postPaymentSignInToken={postPaymentSignInToken}
					/>
				</Container>
			</Suspense>
		);
	}

	if (order.currency.toUpperCase() !== "TWD") {
		throw new Error("NewebPay checkout currently only supports TWD.");
	}

	const amount = Number(order.orderTotal);
	if (!Number.isInteger(amount) || amount <= 0) {
		throw new Error("NewebPay requires a positive integer amount.");
	}

	const credentials = await getNewebPayCredentialsByStore(order.storeId);
	if (!credentials) {
		throw new Error("NewebPay is not configured for this store.");
	}

	const headerList = await headers();
	const host = headerList.get("host");
	const protocol = toProtocol(host);
	const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
	if (!origin) {
		throw new Error("Could not resolve app origin for NewebPay checkout.");
	}

	const merchantOrderNo = createMerchantOrderNo(order.id);
	const confirmedBase = `${origin}/checkout/${order.id}/newebpay/confirmed`;
	const confirmedUrl = returnUrl
		? `${confirmedBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: confirmedBase;
	const notifyUrl = `${origin}/api/shop/checkout/newebpay/notify`;
	const backUrl = returnUrl || `${origin}/checkout/${order.id}`;
	const timeStamp = Math.floor(Number(getUtcNowEpoch()) / 1000).toString();

	const payload = buildNewebPayMpgFormPayload(
		{
			MerchantID: credentials.merchantId,
			RespondType: "String",
			TimeStamp: timeStamp,
			Version: NEWEBPAY_MPG_VERSION,
			MerchantOrderNo: merchantOrderNo,
			Amt: amount,
			ItemDesc: `Order #${order.orderNum ?? order.id}`,
			ReturnURL: confirmedUrl,
			NotifyURL: notifyUrl,
			ClientBackURL: backUrl,
			Email: order.email ?? undefined,
			EmailModify: 0,
			LangType: "zh-tw",
			CREDIT: 1,
		},
		credentials,
	);

	await sqlClient.storeOrder.update({
		where: { id: order.id },
		data: {
			checkoutRef: merchantOrderNo,
			checkoutAttributes: JSON.stringify({
				merchantOrderNo,
				provider: "newebpay",
			}),
		},
	});

	const action = getNewebPayMpgGatewayBaseUrl();
	return (
		<div className="mx-auto max-w-xl space-y-4 pt-12">
			<p className="text-sm text-muted-foreground">
				Redirecting to NewebPay checkout...
			</p>
			<form id="newebpay-submit-form" method="post" action={action}>
				<input type="hidden" name="MerchantID" value={payload.MerchantID} />
				<input type="hidden" name="TradeInfo" value={payload.TradeInfo} />
				<input type="hidden" name="TradeSha" value={payload.TradeSha} />
				<input type="hidden" name="Version" value={payload.Version} />
				<noscript>
					<button className="rounded-md border px-3 py-2" type="submit">
						Continue to NewebPay
					</button>
				</noscript>
			</form>
			<script
				dangerouslySetInnerHTML={{
					__html:
						'document.getElementById("newebpay-submit-form")?.submit();',
				}}
			/>
		</div>
	);
}
