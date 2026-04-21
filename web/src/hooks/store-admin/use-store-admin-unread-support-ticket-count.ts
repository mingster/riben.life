"use client";

import useSWR from "swr";

const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

/**
 * Open root support ticket count for store admin nav (same SWR pattern as RSVP ready-to-confirm).
 */
export function useStoreAdminUnreadSupportTicketCount(
	storeId: string | undefined,
): number | undefined {
	const url =
		storeId && process.env.NEXT_PUBLIC_API_URL
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/support/unread-count`
			: null;

	const { data } = useSWR<{ count: number }>(url, fetcher);

	return data?.count;
}
