"use client";

import type { Store } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns-tz";

import { getNowTimeInTz } from "@/utils/datetime-utils";
import { formatDateTime } from "@/utils/datetime-utils";
import { OrderPending } from "../../components/order-pending";

export interface props {
	store: Store;
}

// Awaiting4ProcessingClient
// it checks for new orders every 5 seconds.
export const Awaiting4ConfirmationClient: React.FC<props> = ({ store }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);

	const date = getNowTimeInTz(8);
	//console.log('date', date);

	const [pendingOrders, setPendingOrders] = useState([]);

	const fetchData = useCallback(() => {
		setLoading(true);

		// get pending orders in the store.
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-for-confirmation`;
		fetch(url)
			.then((data) => {
				return data.json();
			})
			.then((data) => {
				//console.log("data", JSON.stringify(data));
				setPendingOrders(data);
			})
			.catch((error) => {
				console.error("Error:", error);
				throw error;
			});

		setLoading(false);
	}, [store.id]);

	const IntervaledContent = () => {
		useEffect(() => {
			//Implementing the setInterval method
			const interval = setInterval(() => {
				fetchData();
			}, 5000); // do every 5 sec.

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

	//console.log(JSON.stringify(storeData));
	return (
		<section className="relative w-full">
			<IntervaledContent />
			<div className="flex flex-col gap-1">
				<OrderPending
					store={store}
					orders={pendingOrders}
					parentLoading={loading}
				/>
				<div className="text-xs">{formatDateTime(date)}</div>
			</div>
		</section>
	);
};
function getDateInTimezone(_arg0: number) {
	throw new Error("Function not implemented.");
}
