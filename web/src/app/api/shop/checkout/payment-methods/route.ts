import { NextResponse } from "next/server";
import { getLinePayClientByStore } from "@/lib/payment/linePay";
import logger from "@/lib/logger";
import {
	listShopCheckoutPaymentMethodRows,
	normalizePayUrl,
} from "@/lib/payment/resolve-shop-checkout-payment";
import { getPayPalCredentialsByStore } from "@/lib/payment/paypal";
import { sqlClient } from "@/lib/prismadb";
import { getShopStoreIdForApi } from "@/lib/shop-store-context";

/**
 * Lists payment processors available for D2C shop checkout for the resolved storefront store.
 */
export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const storeId = await getShopStoreIdForApi(url.searchParams.get("storeId"));
		if (!storeId) {
			return NextResponse.json({ methods: [] });
		}

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: {
				id: true,
				name: true,
				LINE_PAY_ID: true,
				LINE_PAY_SECRET: true,
				PAYPAL_CLIENT_ID: true,
				PAYPAL_CLIENT_SECRET: true,
			},
		});
		if (!store) {
			return NextResponse.json({ methods: [] });
		}

		const rows = await listShopCheckoutPaymentMethodRows(storeId);
		const methods: { payUrl: string; name: string }[] = [];

		for (const pm of rows) {
			const payUrl = normalizePayUrl(pm.payUrl);
			if (payUrl === "stripe" && !process.env.STRIPE_SECRET_KEY) {
				continue;
			}
			if (payUrl === "linepay") {
				const linePay = await getLinePayClientByStore(storeId, store);
				if (!linePay) {
					continue;
				}
			}
			if (payUrl === "paypal") {
				const payPal = await getPayPalCredentialsByStore(storeId, store);
				if (!payPal) {
					continue;
				}
			}
			methods.push({ payUrl, name: pm.name });
		}

		return NextResponse.json({ methods });
	} catch (err: unknown) {
		logger.error("shop payment-methods list failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "shop", "payment-methods", "error"],
		});
		return NextResponse.json(
			{ error: "Could not load payment methods." },
			{ status: 500 },
		);
	}
}
