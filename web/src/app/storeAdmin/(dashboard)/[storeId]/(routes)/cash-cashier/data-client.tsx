"use client";

import type { Store, StoreOrder } from "@/types";
import { StoreLevel } from "@/types/enum";
import { formatDateTime, getUtcNow } from "@/utils/datetime-utils";
import type { StoreFacility } from "@prisma/client";
import { OrderUnpaid } from "./order-unpaid";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsHydrated } from "@/hooks/use-hydrated";
import useSWR from "swr";

export interface props {
	store: Store;
	facilities: StoreFacility[];
}

// store admin home page.
// it checks for new orders every 5 seconds.
export const CashCashier: React.FC<props> = ({ store, facilities }) => {
	const isHydrated = useIsHydrated();
	const date = getUtcNow();

	// Conditional URL - only fetch if store is not free level and hydrated
	const url =
		store.level !== StoreLevel.Free && store.id && isHydrated
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-unpaid-orders`
			: null;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const {
		data: unpaidOrders,
		error,
		isLoading,
	} = useSWR<StoreOrder[]>(url, fetcher, {
		refreshInterval: 5000, // Poll every 5 seconds
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	// Early return if store is free level
	if (store.level === StoreLevel.Free) {
		return null;
	}

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
	if (error || !unpaidOrders) {
		return null;
	}

	return (
		<section className="relative w-full">
			<div className="flex flex-col gap-1">
				<OrderUnpaid
					store={store}
					facilities={facilities}
					orders={unpaidOrders}
					parentLoading={isLoading}
				/>
				<div className="text-xs">{formatDateTime(date)}</div>
			</div>
		</section>
	);
};
