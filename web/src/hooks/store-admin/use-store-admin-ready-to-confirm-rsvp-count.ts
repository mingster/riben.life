"use client";

import useSWR from "swr";

const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

/**
 * Ready-to-confirm RSVP count for store admin nav badges (same source as the sidebar).
 */
export function useStoreAdminReadyToConfirmRsvpCount(
	storeId: string | undefined,
) {
	const url =
		storeId && process.env.NEXT_PUBLIC_API_URL
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/rsvp/ready-to-confirm-count`
			: null;

	const { data } = useSWR<{ count: number }>(url, fetcher);

	return data?.count ?? 0;
}
