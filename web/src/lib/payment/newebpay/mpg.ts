import {
	createTradeSha,
	decryptTradeInfo,
	encryptTradeInfo,
	verifyTradeSha,
} from "./crypto";
import type {
	NewebPayCallbackEnvelope,
	NewebPayMpgFormPayload,
	NewebPayMpgTradeInfoInput,
	NewebPayPaymentResult,
	NewebPayCredentials,
} from "./types";

export const NEWEBPAY_MPG_VERSION = "2.3";

export function getNewebPayMpgGatewayBaseUrl(): string {
	const isDevelopment = process.env.NODE_ENV === "development";
	return isDevelopment
		? "https://ccore.newebpay.com/MPG/mpg_gateway"
		: "https://core.newebpay.com/MPG/mpg_gateway";
}

export function buildNewebPayMpgFormPayload(
	tradeInfoInput: NewebPayMpgTradeInfoInput,
	credentials: NewebPayCredentials,
): NewebPayMpgFormPayload {
	const tradeInfoRecord: Record<string, string | number | undefined> = {
		...tradeInfoInput,
	};
	const tradeInfo = encryptTradeInfo(tradeInfoRecord, credentials);
	const tradeSha = createTradeSha(tradeInfo, credentials);
	return {
		MerchantID: credentials.merchantId,
		TradeInfo: tradeInfo,
		TradeSha: tradeSha,
		Version: tradeInfoInput.Version,
	};
}

export function parseNewebPayCallbackEnvelope(
	raw: Record<string, string | undefined>,
): NewebPayCallbackEnvelope {
	const Status = raw.Status?.trim() ?? "";
	const MerchantID = raw.MerchantID?.trim() ?? "";
	const TradeInfo = raw.TradeInfo?.trim() ?? "";
	const TradeSha = raw.TradeSha?.trim() ?? "";
	const Version = raw.Version?.trim() ?? "";

	if (!Status || !MerchantID || !TradeInfo || !TradeSha || !Version) {
		throw new Error("Incomplete NewebPay callback payload.");
	}

	return { Status, MerchantID, TradeInfo, TradeSha, Version };
}

export function parseAndVerifyNewebPayResult(args: {
	envelope: NewebPayCallbackEnvelope;
	credentials: NewebPayCredentials;
}): NewebPayPaymentResult {
	const { envelope, credentials } = args;
	const isValid = verifyTradeSha({
		tradeInfoHex: envelope.TradeInfo,
		tradeSha: envelope.TradeSha,
		credentials,
	});
	if (!isValid) {
		throw new Error("Invalid NewebPay TradeSha.");
	}

	const decrypted = decryptTradeInfo(envelope.TradeInfo, credentials);
	const status = decrypted.Status?.trim();
	if (!status) {
		throw new Error("NewebPay callback missing result status.");
	}
	if (status !== "SUCCESS") {
		throw new Error(
			`NewebPay callback status is ${status}: ${decrypted.Message ?? "Unknown error"}`,
		);
	}

	const rawResult = decrypted.Result ?? "";
	if (!rawResult) {
		throw new Error("NewebPay callback missing transaction result.");
	}

	const resultParams = new URLSearchParams(rawResult);
	const result: NewebPayPaymentResult = {};
	for (const [key, value] of resultParams.entries()) {
		result[key] = value;
	}
	return result;
}
