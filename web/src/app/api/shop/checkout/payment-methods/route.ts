import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import {
	listShopCheckoutPaymentMethodRows,
	normalizePayUrl,
} from "@/lib/payment/resolve-shop-checkout-payment";
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

		const session = await auth.api.getSession({ headers: await headers() });
		const rows = await listShopCheckoutPaymentMethodRows(storeId, {
			checkoutUserId: session?.user?.id ?? null,
		});

		const methods = rows.map((pm) => ({
			payUrl: normalizePayUrl(pm.payUrl),
			name: pm.name,
		}));

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
