"use client";

import { useEffect, useRef } from "react";

import { analytics } from "@/lib/analytics";

export function ShopPurchaseAnalytics({
	orderId,
	value,
	currency,
}: {
	orderId: string;
	value: number;
	currency: string;
}) {
	const sent = useRef(false);

	useEffect(() => {
		if (sent.current) {
			return;
		}
		sent.current = true;
		analytics.trackShopPurchase({
			transaction_id: orderId,
			value,
			currency,
		});
	}, [orderId, value, currency]);

	return null;
}
