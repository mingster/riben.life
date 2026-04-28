import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	getPlatformNewebPayCredentials,
	parseAndVerifyNewebPayResult,
	parseNewebPayCallbackEnvelope,
} from "@/lib/payment/newebpay";
import { parsePaymentCredentials } from "@/lib/payment/payment-credentials";
import { sqlClient } from "@/lib/prismadb";
import { markShopOrderPaidAndNotify } from "@/lib/shop/finalize-shop-order-payment";

async function resolveCredentialsByMerchantId(merchantId: string) {
	const platformCredentials = getPlatformNewebPayCredentials();
	if (platformCredentials && platformCredentials.merchantId === merchantId) {
		return platformCredentials;
	}

	const stores = await sqlClient.store.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			paymentCredentials: true,
		},
	});
	for (const store of stores) {
		const parsed = parsePaymentCredentials(store.paymentCredentials);
		const candidate = parsed.newebpay;
		if (
			candidate?.merchantId?.trim() === merchantId &&
			candidate.hashKey?.trim() &&
			candidate.hashIV?.trim()
		) {
			return {
				merchantId,
				hashKey: candidate.hashKey.trim(),
				hashIV: candidate.hashIV.trim(),
			};
		}
	}

	return null;
}

export async function POST(req: Request) {
	try {
		const body = await req.formData();
		const envelope = parseNewebPayCallbackEnvelope({
			Status: String(body.get("Status") ?? ""),
			MerchantID: String(body.get("MerchantID") ?? ""),
			TradeInfo: String(body.get("TradeInfo") ?? ""),
			TradeSha: String(body.get("TradeSha") ?? ""),
			Version: String(body.get("Version") ?? ""),
		});

		const credentials = await resolveCredentialsByMerchantId(envelope.MerchantID);
		if (!credentials) {
			throw new Error(`NewebPay credentials not found for ${envelope.MerchantID}`);
		}

		const result = parseAndVerifyNewebPayResult({ envelope, credentials });
		const merchantOrderNo = String(result.MerchantOrderNo ?? "");
		const tradeNo = String(result.TradeNo ?? "");
		const paidAmount = Number(result.Amt ?? 0);

		if (!merchantOrderNo || !tradeNo || !Number.isFinite(paidAmount)) {
			throw new Error("NewebPay callback result is incomplete.");
		}

		const order = await sqlClient.storeOrder.findFirst({
			where: {
				checkoutRef: merchantOrderNo,
			},
			select: {
				id: true,
				orderTotal: true,
			},
		});
		if (!order) {
			throw new Error(`Store order not found for merchantOrderNo ${merchantOrderNo}`);
		}

		if (Number(order.orderTotal) !== paidAmount) {
			throw new Error(
				`NewebPay amount mismatch: expected=${order.orderTotal} actual=${paidAmount}`,
			);
		}

		await markShopOrderPaidAndNotify(order.id, tradeNo);
		return new NextResponse("OK", { status: 200 });
	} catch (err: unknown) {
		logger.error("NewebPay notify callback failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["payment", "newebpay", "callback", "error"],
		});
		return new NextResponse("FAIL", { status: 400 });
	}
}
