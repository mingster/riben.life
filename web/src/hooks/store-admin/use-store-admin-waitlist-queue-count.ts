"use client";

import useSWR from "swr";

const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

/**
 * Awaiting-only waitlist count for store admin nav (`waiting` status, current_session scope).
 */
export function useStoreAdminWaitlistQueueCount(
	storeId: string | undefined,
	waitlistEnabled: boolean,
) {
	const url =
		storeId && waitlistEnabled && process.env.NEXT_PUBLIC_API_URL
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/waitlist/nav-queue-count`
			: null;

	const { data } = useSWR<{ count: number }>(url, fetcher);

	return data?.count ?? 0;
}
