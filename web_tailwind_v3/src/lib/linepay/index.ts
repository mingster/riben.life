import { createAuthHttpClient } from "./line-pay-api/auth-http-client";
import { confirmWithClient } from "./line-pay-api/confirm";
import { paymentDetailsWithClient } from "./line-pay-api/payment-details";
import { refundWithClient } from "./line-pay-api/refund";
import { requestWithClient } from "./line-pay-api/request";
import type { LineMerchantConfig } from "./line-pay-api/type";
import { createPaymentApi } from "./payment-api/create";
import type { LinePayClient } from "./type";
export {
	createPaymentDetailsRecoveryHandler,
	paymentDetailsToConfirm,
	paymentDetailsToRefund,
} from "./handler/payment-details-recovery";
export { createTimeoutRetryHandler } from "./handler/timeout-retry";
import { captureWithClient } from "./line-pay-api/capture";
export { HttpError, isHttpError } from "./line-pay-api/error/http";
export {
	LinePayApiError,
	isLinePayApiError,
} from "./line-pay-api/error/line-pay-api";
export { TimeoutError, isTimeoutError } from "./line-pay-api/error/timeout";
import { checkPaymentStatusWithClient } from "./line-pay-api/check-payment-status";
import { checkRegKeyWithClient } from "./line-pay-api/check-regkey";
import { expireRegKeyWithClient } from "./line-pay-api/expire-regkey";
import { payPreapprovedWithClient } from "./line-pay-api/pay-preapproved";
import { voidWithClient } from "./line-pay-api/void";
import { Store } from "@prisma/client";
import isProLevel from "@/actions/storeAdmin/is-pro-level";

export type {
	Package as RequestPackage,
	RedirectUrls,
	Payment,
	Display,
	Shipping as RequestShipping,
	AddFriend,
	FamilyService,
	Extra,
	Options as RequestOptions,
	RequestResponseBody,
	RequestRequestConfig,
	PaymentUrl,
	Info as RequestInfo,
	RequestRequestBody,
} from "./line-pay-api/request";

export type {
	Options as CaptureOptions,
	CaptureRequestBody,
	CaptureRequestConfig,
	PayInfo as CapturePayInfo,
	Info as CaptureInfo,
	CaptureResponseBody,
} from "./line-pay-api/capture";

export type {
	CheckPaymentStatusRequestParams,
	CheckPaymentStatusRequestConfig,
	Shipping as CheckPaymentStatusShipping,
	Info as CheckPaymentStatusInfo,
	CheckPaymentStatusResponseBody,
} from "./line-pay-api/check-payment-status";

export type {
	CheckRegKeyRequestParams,
	CheckRegKeyRequestConfig,
} from "./line-pay-api/check-regkey";

export type {
	ConfirmRequestBody,
	ConfirmRequestConfig,
	PayInfo as ConfirmPayInfo,
	Package as ConfirmPackage,
	Shipping as ConfirmShipping,
	Info as ConfirmInfo,
	ConfirmResponseBody,
} from "./line-pay-api/confirm";

export type {
	ExpireRegKeyRequestBody,
	ExpireRegKeyRequestConfig,
	ExpireRegKeyResponseBody,
} from "./line-pay-api/expire-regkey";

export type {
	PayPreapprovedRequestBody,
	PayPreapprovedRequestConfig,
	Info as PayPreapprovedInfo,
	PayPreapprovedResponseBody,
} from "./line-pay-api/pay-preapproved";

export type {
	Fields,
	PaymentDetailsRequestParams,
	PaymentDetailsRequestConfig,
	PayInfo as PaymentDetailsPayInfo,
	Refund,
	Shipping as PaymentDetailsShipping,
	Package as PaymentDetailsPackage,
	Event,
	Info as PaymentDetailsInfo,
	PaymentDetailsResponseBody,
} from "./line-pay-api/payment-details";

export type {
	RefundRequestBody,
	RefundRequestConfig,
	Info as RefundInfo,
	RefundResponseBody,
} from "./line-pay-api/refund";

export type {
	VoidRequestBody,
	VoidRequestConfig,
	VoidResponseBody,
} from "./line-pay-api/void";

export type {
	RequestConfig,
	ResponseBody,
	ApiHandlerParams,
	ApiHandler,
	ApiResponse,
	PaymentApi,
} from "./payment-api/type";

export type {
	QueryParams,
	EmptyObject,
	LineMerchantConfig,
	HttpResponse,
	GeneralRequestConfig,
	GeneralResponseBody,
	HttpConfig,
	HttpClient,
	Recipient,
	Address,
	Product,
	Currency,
} from "./line-pay-api/type";

/**
 * Create a client for LINE Pay API.
 *
 * @param config Configuration from the LINE Pay for the client
 * @returns LINE Pay client
 */
export function createLinePayClient(config: LineMerchantConfig): LinePayClient {
	const httpClient = createAuthHttpClient(config);

	return {
		request: createPaymentApi("request", requestWithClient, httpClient),
		confirm: createPaymentApi("confirm", confirmWithClient, httpClient),
		capture: createPaymentApi("capture", captureWithClient, httpClient),
		void: createPaymentApi("void", voidWithClient, httpClient),
		refund: createPaymentApi("refund", refundWithClient, httpClient),
		paymentDetails: createPaymentApi(
			"paymentDetails",
			paymentDetailsWithClient,
			httpClient,
		),
		checkPaymentStatus: createPaymentApi(
			"checkPaymentStatus",
			checkPaymentStatusWithClient,
			httpClient,
		),
		checkRegKey: createPaymentApi(
			"checkRegKey",
			checkRegKeyWithClient,
			httpClient,
		),
		payPreapproved: createPaymentApi(
			"payPreapproved",
			payPreapprovedWithClient,
			httpClient,
		),
		expireRegKey: createPaymentApi(
			"expireRegKey",
			expireRegKeyWithClient,
			httpClient,
		),
	};
}

export function getLinePayClient(id: string | null, secret: string | null) {
	let linePayId = id;
	let linePaySecret = secret;

	if (!id || !secret) {
		linePayId = process.env.LINE_PAY_ID || null;
		linePaySecret = process.env.LINE_PAY_SECRET || null;
	}

	if (!linePayId || !linePaySecret) {
		throw new Error("LINE_PAY is not set");
	}

	const env =
		process.env.NODE_ENV === "development" ? "development" : "production";

	const linePayClient = createLinePayClient({
		channelId: linePayId,
		channelSecretKey: linePaySecret,
		env: env, // env can be 'development' or 'production'
	}) as LinePayClient;

	return linePayClient;
}

export async function getLinePayClientByStore(store: Store) {
	// determine line pay id and secret
	let linePayId = store.LINE_PAY_ID;
	let linePaySecret = store.LINE_PAY_SECRET;

	// this store is pro version or not?
	const isPro = await isProLevel(store?.id);
	//console.log("isPro", isPro);

	if (isPro === false) {
		linePayId = process.env.LINE_PAY_ID || null;
		linePaySecret = process.env.LINE_PAY_SECRET || null;

		//console.log('linePayId', linePayId, 'linePaySecret', linePaySecret);
	}

	if (!linePayId || !linePaySecret) {
		throw new Error("LINE_PAY is not set");
	}

	const linePayClient = getLinePayClient(
		linePayId,
		linePaySecret,
	) as LinePayClient;

	return linePayClient;
}
