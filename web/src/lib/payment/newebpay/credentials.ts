import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { parsePaymentCredentials } from "@/lib/payment/payment-credentials";
import { sqlClient } from "@/lib/prismadb";
import type { NewebPayCredentials } from "./types";

function trimCredentials(input: {
	merchantId?: string | null;
	hashKey?: string | null;
	hashIV?: string | null;
}): NewebPayCredentials | null {
	const merchantId = input.merchantId?.trim() ?? "";
	const hashKey = input.hashKey?.trim() ?? "";
	const hashIV = input.hashIV?.trim() ?? "";
	if (!merchantId || !hashKey || !hashIV) {
		return null;
	}
	return { merchantId, hashKey, hashIV };
}

export function getPlatformNewebPayCredentials(): NewebPayCredentials | null {
	return trimCredentials({
		merchantId:
			process.env.NEWEBPAY_MERCHANT_ID ?? process.env.newebpay_ACCOUNT ?? null,
		hashKey:
			process.env.NEWEBPAY_HASH_KEY ?? process.env.newebpay_hash_key ?? null,
		hashIV: process.env.NEWEBPAY_HASH_IV ?? process.env.newebpay_hash_iv ?? null,
	});
}

export async function getNewebPayCredentialsByStore(
	storeId: string,
	store?: { paymentCredentials: unknown } | null,
): Promise<NewebPayCredentials | null> {
	const isPro = await isProLevel(storeId);
	if (!isPro) {
		return getPlatformNewebPayCredentials();
	}

	let raw: unknown = store?.paymentCredentials;
	if (raw === undefined) {
		const row = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { paymentCredentials: true },
		});
		raw = row?.paymentCredentials;
	}

	const parsed = parsePaymentCredentials(raw);
	const storeCredentials = trimCredentials({
		merchantId: parsed.newebpay?.merchantId,
		hashKey: parsed.newebpay?.hashKey,
		hashIV: parsed.newebpay?.hashIV,
	});
	if (storeCredentials) {
		return storeCredentials;
	}

	return getPlatformNewebPayCredentials();
}
