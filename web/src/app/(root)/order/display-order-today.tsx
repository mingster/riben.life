"use client";

import { AskUserToSignIn } from "@/components/auth/ask-user-to-signIn";
import { DisplayOrder } from "@/components/display-order";
import StoreRequirePrepaidPrompt from "@/components/store-require-prepaid-prompt";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	KEY_LOCALORDERS,
	getOrdersFromLocal,
	removeOrdersFromLocal,
} from "@/lib/order-history";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import { getUtcNow, epochToDate } from "@/utils/datetime-utils";
import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { useIsHydrated } from "@/hooks/use-hydrated";
import useSWR from "swr";

export interface props {
	store: Store;
}

// view order page (購物明細)
// show orders in local storage placed today
// NOTE: we need local storage because we allow anonymous user to place order
export const DisplayStoreOrdersToday: React.FC<props> = ({ store }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { data: session } = authClient.useSession();
	const isHydrated = useIsHydrated();

	const storeId = store.id;

	// Get orderIds from localStorage (only after hydration)
	const orderIds = useMemo(() => {
		if (!isHydrated) return [];
		return getOrdersFromLocal();
	}, [isHydrated]);

	// Create SWR key that includes orderIds so it refetches when they change
	// Use JSON.stringify to create a stable key from the array
	const swrKey =
		storeId && isHydrated && orderIds.length > 0
			? [`/store/${storeId}/get-orders`, JSON.stringify(orderIds)]
			: null;

	// Custom fetcher for POST request
	const fetcher = async ([url, orderIdsStr]: [string, string]) => {
		const orderIds = JSON.parse(orderIdsStr);
		const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				orderIds: orderIds,
			}),
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	};

	const {
		data: orders,
		error,
		isLoading,
		mutate,
	} = useSWR<StoreOrder[]>(swrKey, fetcher, {
		refreshInterval: 15000, // Poll every 15 seconds
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	// Side effects: link orders and update localStorage
	useEffect(() => {
		if (!isHydrated || !orders) return;

		// Link orders if user is signed in
		const linkOrders = async () => {
			if (session?.user?.id) {
				const orders_local = getOrdersFromLocal();
				const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
				try {
					await axios.patch(url, {
						orderIds: orders_local,
					});
				} catch (error) {
					// Silently fail - don't show error for linking
				}
			}
		};

		// Remove outdated local orders
		const removeOutedLocalOrders = () => {
			const today = getUtcNow();
			const orderArray: string[] = [];

			orders.forEach((order: StoreOrder) => {
				// Convert BigInt epoch to Date
				const orderDate =
					order.updatedAt instanceof Date
						? order.updatedAt
						: (epochToDate(
								typeof order.updatedAt === "number"
									? BigInt(order.updatedAt)
									: typeof order.updatedAt === "bigint"
										? order.updatedAt
										: BigInt(order.updatedAt),
							) ?? new Date());
				// Use UTC methods for comparison since both dates are in UTC
				if (
					orderDate.getUTCFullYear() === today.getUTCFullYear() &&
					orderDate.getUTCMonth() === today.getUTCMonth() &&
					orderDate.getUTCDate() === today.getUTCDate()
				) {
					orderArray.push(order.id);
				}
			});

			// Update local storage
			removeOrdersFromLocal();
			localStorage.setItem(KEY_LOCALORDERS, JSON.stringify(orderArray));
		};

		linkOrders();
		removeOutedLocalOrders();
	}, [orders, isHydrated, session?.user?.id]);

	// Early return if no storeId
	if (!storeId) {
		return null;
	}

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<section className="relative w-full">
				<div className="container">
					<Skeleton className="h-8 w-48 mb-4" />
					<div className="flex flex-col gap-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-32 w-full" />
						))}
					</div>
				</div>
			</section>
		);
	}

	// Show loading state
	if (isLoading) {
		return (
			<section className="relative w-full">
				<div className="container">
					<Skeleton className="h-8 w-48 mb-4" />
					<div className="flex flex-col gap-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-32 w-full" />
						))}
					</div>
				</div>
			</section>
		);
	}

	// Show error state (silent fail - don't show error UI)
	if (error || !orders) {
		return null;
	}

	return (
		<section className="relative w-full">
			<div className="container">
				<h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

				<div className="flex flex-col">
					<div className="flex-1 p-1 space-y-1">
						{orders.map((order: StoreOrder) => (
							<div key={order.id}>
								{store.requirePrepaid && order.isPaid === false && (
									<StoreRequirePrepaidPrompt />
								)}

								<DisplayOrder order={order} />
							</div>
						))}
					</div>
				</div>

				<Link href={`/s/${storeId}`} className="">
					<Button className="w-full">{t("cart_summary_keepShopping")}</Button>
				</Link>

				<AskUserToSignIn />
			</div>
		</section>
	);
};
