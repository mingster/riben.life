import { describe, expect, test } from "bun:test";
import {
	createTradeSha,
	decryptTradeInfo,
	encryptTradeInfo,
	verifyTradeSha,
} from "@/lib/payment/newebpay/crypto";
import {
	parseAndVerifyNewebPayResult,
	parseNewebPayCallbackEnvelope,
} from "@/lib/payment/newebpay/mpg";
import type { NewebPayCredentials } from "@/lib/payment/newebpay";

const credentials: NewebPayCredentials = {
	merchantId: "MS123456789",
	hashKey: "12345678901234567890123456789012",
	hashIV: "1234567890123456",
};

describe("newebpay crypto helpers", () => {
	test("encrypt/decrypt round trip works", () => {
		const payload = {
			MerchantOrderNo: "SO123456",
			Amt: 2000,
			ItemDesc: "Test order",
			CREDIT: 1,
		};
		const encrypted = encryptTradeInfo(payload, credentials);
		const decrypted = decryptTradeInfo(encrypted, credentials);

		expect(decrypted.MerchantOrderNo).toBe("SO123456");
		expect(decrypted.Amt).toBe("2000");
		expect(decrypted.ItemDesc).toBe("Test order");
		expect(decrypted.CREDIT).toBe("1");
	});

	test("trade sha verification succeeds with matching signature", () => {
		const encrypted = encryptTradeInfo(
			{
				MerchantOrderNo: "SO123456",
				Amt: 100,
			},
			credentials,
		);
		const tradeSha = createTradeSha(encrypted, credentials);

		expect(
			verifyTradeSha({
				tradeInfoHex: encrypted,
				tradeSha,
				credentials,
			}),
		).toBe(true);
	});

	test("trade sha verification fails with tampered signature", () => {
		const encrypted = encryptTradeInfo(
			{
				MerchantOrderNo: "SO123456",
				Amt: 100,
			},
			credentials,
		);

		expect(
			verifyTradeSha({
				tradeInfoHex: encrypted,
				tradeSha: "DEADBEEF",
				credentials,
			}),
		).toBe(false);
	});

	test("parse and verify callback result", () => {
		const resultString = new URLSearchParams({
			MerchantID: credentials.merchantId,
			Amt: "1000",
			TradeNo: "2201011234567890",
			MerchantOrderNo: "SO123456",
			PaymentType: "CREDIT",
		}).toString();

		const encryptedResult = encryptTradeInfo(
			{
				Status: "SUCCESS",
				Message: "OK",
				Result: resultString,
			},
			credentials,
		);
		const envelope = parseNewebPayCallbackEnvelope({
			Status: "SUCCESS",
			MerchantID: credentials.merchantId,
			TradeInfo: encryptedResult,
			TradeSha: createTradeSha(encryptedResult, credentials),
			Version: "2.3",
		});

		const result = parseAndVerifyNewebPayResult({ envelope, credentials });
		expect(result.MerchantOrderNo).toBe("SO123456");
		expect(result.Amt).toBe("1000");
		expect(result.TradeNo).toBe("2201011234567890");
	});

	test("parse and verify rejects invalid signature", () => {
		const encryptedResult = encryptTradeInfo(
			{
				Status: "SUCCESS",
				Message: "OK",
				Result: new URLSearchParams({
					MerchantOrderNo: "SO123456",
					Amt: "1000",
				}).toString(),
			},
			credentials,
		);
		const envelope = parseNewebPayCallbackEnvelope({
			Status: "SUCCESS",
			MerchantID: credentials.merchantId,
			TradeInfo: encryptedResult,
			TradeSha: "BAD_SIGNATURE",
			Version: "2.3",
		});

		expect(() =>
			parseAndVerifyNewebPayResult({
				envelope,
				credentials,
			}),
		).toThrow("Invalid NewebPay TradeSha.");
	});
});
