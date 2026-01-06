"use client";

import type { Store, StoreOrder } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/utils/datetime-utils";
import { getUtcNow } from "@/utils/datetime-utils";
import { OrderReadyToShip } from "../../components/order-ready-to-ship";
import { useIsHydrated } from "@/hooks/use-hydrated";
import useSWR from "swr";

export interface props {
	store: Store;
}

// AwaitingToShipClient
// it checks for new orders every 5 seconds.
export const AwaitingToShipClient: React.FC<props> = ({ store }) => {
	const isHydrated = useIsHydrated();
	const date = getUtcNow();

	// Conditional URL - only fetch if storeId exists and hydrated
	const url =
		store.id && isHydrated
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-to-ship`
			: null;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const {
		data: awaitingToShipOrders,
		error,
		isLoading,
	} = useSWR<StoreOrder[]>(url, fetcher, {
		refreshInterval: 5000, // Poll every 5 seconds
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<section className="relative w-full">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-4 w-32" />
				</div>
			</section>
		);
	}

	// Show loading state
	if (isLoading) {
		return (
			<section className="relative w-full">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-4 w-32" />
				</div>
			</section>
		);
	}

	// Show error state (silent fail - don't show error UI)
	if (error || !awaitingToShipOrders) {
		return null;
	}

	return (
		<section className="relative w-full">
			<div className="flex flex-col gap-1">
				<OrderReadyToShip
					store={store}
					orders={awaitingToShipOrders}
					parentLoading={isLoading}
				/>

				<div className="text-xs">{formatDateTime(date)}</div>
			</div>
		</section>
	);
};
