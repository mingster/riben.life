"use client";

import type { Store } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { Loader } from "@/components/loader";
import { StoreLevel } from "@/types/enum";
import { formatDateTime, getUtcNow } from "@/utils/datetime-utils";
import type { StoreFacility } from "@prisma/client";
import { OrderUnpaid } from "./order-unpaid";
import logger from "@/lib/logger";

export interface props {
	store: Store;
	facilities: StoreFacility[];
}

// store admin home page.
// it checks for new orders every 10 seconds.
export const CashCashier: React.FC<props> = ({ store, facilities }) => {
	//const { lng } = useI18n();
	//const { t } = useTranslation(lng);
	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);

	const date = getUtcNow();
	const [unpaidOrders, setUnpaidOrders] = useState([]);

	const fetchData = useCallback(() => {
		setLoading(true);

		// get pending and processing orders in the store.
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-unpaid-orders`;
		fetch(url)
			.then((data) => {
				return data.json();
			})
			.then((data) => {
				//console.log("data", JSON.stringify(data));
				setUnpaidOrders(data);
			})
			.catch((error) => {
				logger.error("Error:", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["error"],
				});
				throw error;
			});

		setLoading(false);
	}, [store.id]);

	const IntervaledContent = () => {
		useEffect(() => {
			//Implementing the setInterval method
			const interval = setInterval(() => {
				fetchData();
			}, 5000); // do every 10 sec.

			//Clearing the interval
			return () => clearInterval(interval);
		}, []);

		return <></>;
	};

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		// fetch data as soon as page is mounted
		if (!mounted) fetchData();
		setMounted(true);
	}, [mounted, fetchData]);

	if (!mounted) {
		return null;
	}

	if (loading) return <Loader />;

	if (store.level !== StoreLevel.Free) {
		return (
			<section className="relative w-full">
				<IntervaledContent />
				<div className="flex flex-col gap-1">
					<OrderUnpaid
						store={store}
						facilities={facilities}
						orders={unpaidOrders}
						parentLoading={loading}
					/>
					<div className="text-xs">{formatDateTime(date)}</div>
				</div>
			</section>
		);
	}
};
