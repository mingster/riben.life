import axios, {
	type InternalAxiosRequestConfig,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
	type AxiosResponseTransformer,
} from "axios";
import Base64 from "crypto-js/enc-base64";
import hmacSHA256 from "crypto-js/hmac-sha256";
import { v4 as uuidv4 } from "uuid";
import { HttpError } from "./error/http";
import { LinePayApiError } from "./error/line-pay-api";
import { TimeoutError } from "./error/timeout";
import type {
	GeneralResponseBody,
	LineMerchantConfig,
	QueryParams,
} from "./type";

export type AuthHttpClient = AxiosInstance;

type RequestHeader = {
	"Content-Type": "application/json";
	"X-LINE-ChannelId": string;
	"X-LINE-MerchantDeviceProfileId"?: string;
	"X-LINE-Authorization-Nonce": string;
	"X-LINE-Authorization": string;
};

/**
 * convert query object to query string
 *
 * @param params query string object
 * @returns query string
 */
export function paramsSerializer(params: QueryParams): string {
	return Object.entries(params)
		.map((p) =>
			p
				.map((v) => v.toString())
				.map(encodeURIComponent)
				.join("="),
		)
		.join("&");
}

function encrypt(data: string, secretKey: string): string {
	const hmac = hmacSHA256(data, secretKey);

	return Base64.stringify(hmac);
}

function generateHeader(
	channelId: string,
	nonce: string,
	signature: string,
): RequestHeader {
	// Validate channel ID before using it
	if (!channelId || typeof channelId !== "string" || channelId.trim() === "") {
		throw new Error(
			`Invalid channel ID: channelId must be a non-empty string. Received: ${JSON.stringify(channelId)}`,
		);
	}

	const trimmedChannelId = channelId.trim();

	return {
		"Content-Type": "application/json",
		"X-LINE-ChannelId": trimmedChannelId,
		"X-LINE-Authorization-Nonce": nonce,
		"X-LINE-Authorization": signature,
	};
}

/**
 * Implement LINE Pay API GET Authentication specification
 * Signature = Base64(HMAC-SHA256(Your ChannelSecret, (Your ChannelSecret + URL Path + Query String + nonce)))\
 * Query String : A query string except ? (Example: Name1=Value1&Name2=Value2...)
 */
function handleGetRequest(
	merchantConfig: LineMerchantConfig,
	config: AxiosRequestConfig,
): AxiosRequestConfig {
	const nonce = uuidv4();

	const queryString = paramsSerializer({ ...config.params });

	const text = `${merchantConfig.channelSecretKey}${config.url}${queryString}${nonce}`;
	const signature = encrypt(text, merchantConfig.channelSecretKey);

	const headers = generateHeader(merchantConfig.channelId, nonce, signature);

	return {
		...config,
		headers,
	};
}

/**
 * Implement LINE Pay API POST Authentication specification
 * Signature = Base64(HMAC-SHA256(Your ChannelSecret, (Your ChannelSecret + URL Path + RequestBody + nonce)))
 */
function handlePostRequest(
	merchantConfig: LineMerchantConfig,
	config: AxiosRequestConfig,
): AxiosRequestConfig {
	const nonce = uuidv4();
	const dataString = JSON.stringify(config.data);

	const text = `${merchantConfig.channelSecretKey}${config.url}${dataString}${nonce}`;
	const signature = encrypt(text, merchantConfig.channelSecretKey);

	const headers = generateHeader(merchantConfig.channelId, nonce, signature);

	return {
		...config,
		headers,
	};
}

export function createAuthHttpClient(
	merchantConfig: LineMerchantConfig,
): AuthHttpClient {
	const PRODUCTION_URL = "https://api-pay.line.me";
	const SANDBOX_URL = "https://sandbox-api-pay.line.me";

	const BASE_URL =
		merchantConfig.env === "production" ? PRODUCTION_URL : SANDBOX_URL;

	//console.log("BASE_URL", BASE_URL);

	/**
	 * JavaScript numbers are double-precision floating-point.
	 * Transaction ID is larger than the largest integer JavaScript can be precisely stored (which is 2^53, 9007199254740992).
	 * So we should convert the number to string.
	 */
	const transformResponse: AxiosResponseTransformer = (data) =>
		typeof data !== "string"
			? data
			: JSON.parse(
					data
						.replace(/"transactionId":\s*(\d+)/g, '"transactionId":"$1"')
						.replace(
							/"refundTransactionId":\s*(\d+)/g,
							'"refundTransactionId":"$1"',
						),
				);

	const axiosInstance = axios.create({
		baseURL: BASE_URL,
		paramsSerializer,
		timeout: merchantConfig.timeout ?? 20000,
		transformResponse,
	});

	// add auth headers

	axiosInstance.interceptors.request.use((config) =>
		config.method === "get"
			? (handleGetRequest(
					merchantConfig,
					config,
				) as InternalAxiosRequestConfig<GeneralResponseBody>)
			: config.method === "post"
				? (handlePostRequest(
						merchantConfig,
						config,
					) as InternalAxiosRequestConfig<GeneralResponseBody>)
				: config,
	);

	axiosInstance.interceptors.response.use(
		(res: AxiosResponse<GeneralResponseBody>) => {
			if (!res.data) {
				throw new Error("Empty result");
			}

			if (res.data.returnCode.length !== 4) {
				throw new Error("Length of returnCode should be 4");
			}

			if (!res.data.returnCode.startsWith("0")) {
				// Log detailed error information for debugging
				const logger = (async () => {
					const { default: logger } = await import("@/lib/logger");
					return logger;
				})();

				logger
					.then((log) => {
						log.error("LINE Pay API error", {
							metadata: {
								returnCode: res.data.returnCode,
								returnMessage: res.data.returnMessage,
								status: res.status,
								channelId: merchantConfig.channelId?.substring(0, 4) + "***", // Mask for security
								env: merchantConfig.env,
							},
							tags: ["linepay", "api", "error"],
						});
					})
					.catch(() => {
						// Silently fail if logger is not available
					});

				throw new LinePayApiError(res.data.returnMessage, res.status, res.data);
			}

			return res;
		},
		(err) => {
			if (err.response !== undefined) {
				throw new HttpError(
					err.message,
					err.response.status,
					err.response.data,
				);
			} else if (err.response === undefined && err.code === "ECONNABORTED") {
				throw new TimeoutError(err.message);
			}
			throw err;
		},
	);

	return axiosInstance;
}
