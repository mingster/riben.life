"use client";

import { AskUserToSignIn } from "@/components/auth/ask-user-to-signIn";
import { DisplayOrder } from "@/components/order-display";
import StoreRequirePrepaidPrompt from "@/components/store-require-prepaid-prompt";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/loader";
import {
	KEY_LOCALORDERS,
	getOrdersFromLocal,
	removeOrdersFromLocal,
} from "@/lib/order-history";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import { getUtcNow } from "@/utils/datetime-utils";
import axios from "axios";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
//import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface props {
	store: Store;
}

// view order page (購物明細)
// show orders in local storage placed today
// NOTE: we need local storage because we allow anonymous user to place order
export const DisplayStoreOrdersToday: React.FC<props> = ({ store }) => {
	const [orders, setOrders] = useState([]);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { data: session } = useSession();

	const [loading, setLoading] = useState(false);
	const [mounted, setMounted] = useState(false);

	//const param = useSearchParams();
	//const storeId = param.get("storeId");
	const storeId = store.id;

	//console.log('orders_local', orders_local);

	const linkOrders = async () => {
		// if user is signed in, update the orders
		if (session?.user?.id) {
			const orders_local = getOrdersFromLocal();

			const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
			await axios.patch(url, {
				orderIds: orders_local,
			});
		}
	};

	const removeOutedLocalOrders = () => {
		// filter orders by date
		const today = getUtcNow();
		const orderArray = JSON.parse("[]");

		orders.map((order: StoreOrder) => {
			//orders is from fetchData()
			const orderDate = new Date(order.updatedAt);
			if (
				orderDate.getFullYear() === today.getFullYear() &&
				orderDate.getMonth() === today.getMonth() &&
				orderDate.getDate() === today.getDate()
				//&& order.storeId === storeId
			) {
				orderArray.push(order.id);
			}
		});

		//console.log('orderArray', orderArray);
		// update local storage
		removeOrdersFromLocal();
		localStorage.setItem(KEY_LOCALORDERS, JSON.stringify(orderArray));
	};

	const fetchData = useCallback(() => {
		setLoading(true);

		const orders_local = getOrdersFromLocal();
		//console.log("orders_local", orders_local);

		const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-orders`;
		const body = JSON.stringify({
			orderIds: orders_local,
		});

		fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: body,
		})
			.then((res) => res.json())
			.then((data) => {
				//console.log('data', JSON.stringify(data));
				setOrders(data);
			})
			.catch((error) => {
				console.error("Error:", error);
				throw error;
			});

		setLoading(false);
	}, [storeId]);

	const IntervaledContent = () => {
		useEffect(() => {
			//Implementing the setInterval method
			const interval = setInterval(() => {
				fetchData();
				linkOrders();
				removeOutedLocalOrders();
			}, 15000); // do every 15 sec.

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

	if (!storeId) return <></>;

	if (loading) return <Loader />;

	return (
		<section className="relative w-full">
			<div className="container">
				<h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

				<IntervaledContent />

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

				<Link href={`/${storeId}`} className="">
					<Button className="w-full">
						{t("cart_summary_keepShopping")}
					</Button>{" "}
				</Link>

				<AskUserToSignIn />
			</div>
		</section>
	);
};
