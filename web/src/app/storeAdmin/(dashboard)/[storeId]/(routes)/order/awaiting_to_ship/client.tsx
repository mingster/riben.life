"use client";

import type { Store } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";
import { formatDateTime } from "@/lib/utils";
import { OrderInProgress } from "../../components/order-inprogress";
import { OrderReadyToShip } from "../../components/order-ready-to-ship";

export interface props {
	store: Store;
}

// AwaitingToShipClient
// it checks for new orders every 5 seconds.
export const AwaitingToShipClient: React.FC<props> = ({ store }) => {
	//const { lng } = useI18n();
	//const { t } = useTranslation(lng, "storeAdmin");

	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);

	const date = new Date();
	const [awaitingToShipOrders, setAwaitingToShipOrders] = useState([]);

	const fetchData = useCallback(() => {
		setLoading(true);

		// get processing orders in the store.
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-to-ship`;
		fetch(url)
			.then((data) => {
				return data.json();
			})
			.then((data) => {
				//console.log("data", JSON.stringify(data));
				setAwaitingToShipOrders(data);

				/*
        if (store.requirePrepaid) {
          const prepayOrders = data.filter((order: StoreOrder) => order.isPaid);
          setPendingOrders(
            prepayOrders.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Pending ||
                order.orderStatus === OrderStatus.InShipping,
            ),
          );
          setAwaitingToShipOrders(
            prepayOrders.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Processing,
            ),
          );
        } else {
          setPendingOrders(
            data.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Pending ||
                order.orderStatus === OrderStatus.InShipping,
            ),
          );
          setAwaitingToShipOrders(
            data.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Processing,
            ),
          );
        }
        */
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

	return (
		<section className="relative w-full">
			<IntervaledContent />
			<div className="flex flex-col gap-1">
				<OrderReadyToShip
					store={store}
					orders={awaitingToShipOrders}
					parentLoading={loading}
				/>

				<div className="text-xs">{formatDateTime(date)}</div>
			</div>
		</section>
	);
};
