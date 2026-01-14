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
 * https://github.com/enylin/line-pay-merchant?tab=readme-ov-file
 * @param config Configuration from the LINE Pay for the client
 * @returns LINE Pay client
 */
export function createLinePayClient(config: LineMerchantConfig): LinePayClient {
	// Validate config before creating client
	if (
		!config.channelId ||
		typeof config.channelId !== "string" ||
		config.channelId.trim() === ""
	) {
		throw new Error(
			`Invalid LINE Pay config: channelId must be a non-empty string. Received: ${JSON.stringify(config.channelId)}`,
		);
	}
	if (
		!config.channelSecretKey ||
		typeof config.channelSecretKey !== "string" ||
		config.channelSecretKey.trim() === ""
	) {
		throw new Error(
			`Invalid LINE Pay config: channelSecretKey must be a non-empty string.`,
		);
	}

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

	// Validate that channel ID and secret are non-empty strings
	// Trim whitespace to catch cases where env vars have spaces
	const trimmedId = linePayId?.trim();
	const trimmedSecret = linePaySecret?.trim();

	if (
		!trimmedId ||
		!trimmedSecret ||
		trimmedId === "" ||
		trimmedSecret === ""
	) {
		throw new Error(
			"LINE_PAY is not set or invalid (channel ID and secret must be non-empty strings)",
		);
	}

	// Validate channel ID format - LINE Pay channel IDs are typically numeric strings
	// Allow alphanumeric but ensure it's not empty after validation
	if (!/^[a-zA-Z0-9]+$/.test(trimmedId)) {
		throw new Error(
			`LINE_PAY channel ID format is invalid: channel ID must contain only alphanumeric characters. Received: ${trimmedId.substring(0, 10)}...`,
		);
	}

	const env =
		process.env.NODE_ENV === "development" ? "development" : "production";

	const linePayClient = createLinePayClient({
		channelId: trimmedId,
		channelSecretKey: trimmedSecret,
		env: env, // env can be 'development' or 'production'
	}) as LinePayClient;

	return linePayClient;
}

/**
 * Get LINE Pay client based on store configuration.
 *
 * Logic:
 * - If store is not Pro level: use platform payment processing (null, null)
 * - If store is Pro level:
 *   - If store has LINE_PAY_ID and LINE_PAY_SECRET: use store credentials
 *   - Otherwise: fall back to platform payment processing (null, null)
 *
 * @param storeId - Store ID to check Pro level and credentials
 * @param store - Optional store object with LINE_PAY_ID and LINE_PAY_SECRET (if already fetched)
 * @returns LINE Pay client or null if not configured
 */
export async function getLinePayClientByStore(
	storeId: string,
	store?: { LINE_PAY_ID: string | null; LINE_PAY_SECRET: string | null } | null,
): Promise<LinePayClient | null> {
	const { sqlClient } = await import("@/lib/prismadb");
	const isProLevel = (await import("@/actions/storeAdmin/is-pro-level"))
		.default;

	const isPro = await isProLevel(storeId);

	if (!isPro) {
		// Use platform payment processing
		return getLinePayClient(null, null);
	}

	// Get store configuration if not provided
	let storeConfig = store;
	if (!storeConfig) {
		const storeData = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				LINE_PAY_ID: true,
				LINE_PAY_SECRET: true,
			},
		});
		storeConfig = storeData;
	}

	// If store has LINE Pay credentials, use them
	// Validate that both ID and secret are non-empty strings (not just non-null)
	if (
		storeConfig &&
		storeConfig.LINE_PAY_ID !== null &&
		storeConfig.LINE_PAY_ID !== undefined &&
		storeConfig.LINE_PAY_ID.trim() !== "" &&
		storeConfig.LINE_PAY_SECRET !== null &&
		storeConfig.LINE_PAY_SECRET !== undefined &&
		storeConfig.LINE_PAY_SECRET.trim() !== ""
	) {
		return getLinePayClient(
			storeConfig.LINE_PAY_ID,
			storeConfig.LINE_PAY_SECRET,
		);
	}

	// Fall back to platform payment processing
	return getLinePayClient(null, null);
}
