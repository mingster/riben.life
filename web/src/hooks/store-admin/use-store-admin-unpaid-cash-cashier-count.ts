"use client";

import useSWR from "swr";

const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

/**
 * Unpaid order count for cash cashier nav badge (same rules as get-unpaid-orders).
 */
export function useStoreAdminUnpaidCashCashierCount(
	storeId: string | undefined,
	enabled: boolean,
) {
	const url =
		storeId && enabled && process.env.NEXT_PUBLIC_API_URL
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/orders/unpaid-cash-cashier-count`
			: null;

	const { data } = useSWR<{ count: number }>(url, fetcher, {
		refreshInterval: 10_000,
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	return data?.count ?? 0;
}
