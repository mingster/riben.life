import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import {
	capturePayPalOrder,
	getPayPalCredentialsByStore,
} from "@/lib/payment/paypal";
import { sqlClient } from "@/lib/prismadb";
import { markShopOrderPaidAndNotify } from "@/lib/shop/finalize-shop-order-payment";

/**
 * PayPal return URL after buyer approves. Query: orderId (ours), token (PayPal order id), PayerID.
 */
export async function GET(req: Request) {
	const url = new URL(req.url);
	const orderId = url.searchParams.get("orderId");
	const token = url.searchParams.get("token");

	const failRedirect = (msg: string, storeId?: string) =>
		NextResponse.redirect(
			new URL(
				storeId
					? `/shop/${storeId}/cart?checkout_error=${encodeURIComponent(msg)}`
					: `/shop`,
				url.origin,
			),
		);

	if (!orderId || !token) {
		return failRedirect("missing_paypal_params");
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return NextResponse.redirect(
			new URL(
				`/signIn?callbackUrl=${encodeURIComponent(`/api/shop/checkout/paypal/return?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`)}`,
				url.origin,
			),
		);
	}

	const order = await sqlClient.storeOrder.findFirst({
		where: { id: orderId, userId: session.user.id },
		include: {
			Store: {
				select: {
					id: true,
					paymentCredentials: true,
				},
			},
		},
	});

	if (!order || order.checkoutRef !== token) {
		return failRedirect("order_mismatch", order?.storeId);
	}

	const payPalMethod = await sqlClient.paymentMethod.findFirst({
		where: {
			payUrl: { equals: "paypal", mode: "insensitive" },
			isDeleted: false,
		},
		select: { platformEnabled: true },
	});
	if (payPalMethod && !payPalMethod.platformEnabled) {
		return failRedirect("payment_processor_disabled", order.storeId);
	}

	if (order.isPaid) {
		return NextResponse.redirect(
			new URL(
				`/shop/${order.storeId}/checkout/success?paypal=1&order_id=${encodeURIComponent(orderId)}`,
				url.origin,
			),
		);
	}

	const creds = await getPayPalCredentialsByStore(order.storeId, order.Store);
	if (!creds) {
		return failRedirect("paypal_not_configured", order.storeId);
	}

	const captured = await capturePayPalOrder(
		creds.clientId,
		creds.clientSecret,
		token,
	);

	if ("error" in captured) {
		logger.error("PayPal capture failed on return", {
			metadata: { orderId, token, error: captured.error },
			tags: ["shop", "paypal", "error"],
		});
		return failRedirect("paypal_capture_failed", order.storeId);
	}

	await markShopOrderPaidAndNotify(orderId, captured.captureId);

	return NextResponse.redirect(
		new URL(
			`/shop/${order.storeId}/checkout/success?paypal=1&order_id=${encodeURIComponent(orderId)}`,
			url.origin,
		),
	);
}
