import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getLinePayClientByStore } from "@/lib/payment/linePay";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { markShopOrderPaidAndNotify } from "@/lib/shop/finalize-shop-order-payment";
import { toLinePayCurrency } from "@/lib/shop/line-pay-currency";
import { majorUnitsToStripeUnit } from "@/lib/payment/stripe/stripe-money";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const transactionId = url.searchParams.get("transactionId");
	const orderId = url.searchParams.get("orderId");

	const failRedirect = (msg: string, storeId?: string) =>
		NextResponse.redirect(
			new URL(
				storeId
					? `/shop/${storeId}/cart?checkout_error=${encodeURIComponent(msg)}`
					: `/shop`,
				url.origin,
			),
		);

	if (!transactionId || !orderId) {
		return failRedirect("missing_linepay_params");
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return NextResponse.redirect(
			new URL(
				`/signIn?callbackUrl=${encodeURIComponent(`/api/shop/checkout/linepay/confirm?transactionId=${transactionId}&orderId=${orderId}`)}`,
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

	if (!order || order.checkoutRef !== transactionId) {
		return failRedirect("order_mismatch", order?.storeId);
	}

	const linePayMethod = await sqlClient.paymentMethod.findFirst({
		where: { payUrl: "linepay", isDeleted: false },
		select: { platformEnabled: true },
	});
	if (linePayMethod && !linePayMethod.platformEnabled) {
		return failRedirect("payment_processor_disabled", order.storeId);
	}

	if (order.isPaid) {
		return NextResponse.redirect(
			new URL(
				`/shop/${order.storeId}/checkout/success?linepay=1&order_id=${encodeURIComponent(orderId)}`,
				url.origin,
			),
		);
	}

	const linePay = await getLinePayClientByStore(order.storeId, order.Store);
	if (!linePay) {
		return failRedirect("linepay_not_configured", order.storeId);
	}

	const lineCurrency = toLinePayCurrency(order.currency);
	if (!lineCurrency) {
		return failRedirect("unsupported_currency", order.storeId);
	}

	const amount = majorUnitsToStripeUnit(
		order.currency.toLowerCase(),
		Number(order.orderTotal),
	);

	const confirmRes = await linePay.confirm.send({
		transactionId,
		body: {
			amount,
			currency: lineCurrency,
		},
	});

	if (confirmRes.body.returnCode !== "0000") {
		logger.error("LINE Pay confirm failed", {
			metadata: {
				orderId,
				transactionId,
				returnCode: confirmRes.body.returnCode,
				returnMessage: confirmRes.body.returnMessage,
			},
			tags: ["shop", "linepay", "confirm"],
		});
		return failRedirect("linepay_confirm_failed", order.storeId);
	}

	await markShopOrderPaidAndNotify(orderId, transactionId);

	return NextResponse.redirect(
		new URL(
			`/shop/${order.storeId}/checkout/success?linepay=1&order_id=${encodeURIComponent(orderId)}`,
			url.origin,
		),
	);
}
