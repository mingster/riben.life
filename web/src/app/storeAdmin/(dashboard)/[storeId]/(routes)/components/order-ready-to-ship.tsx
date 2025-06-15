"use client";

import { useEffect, useState } from "react";

import { toastSuccess } from "@/components/Toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { DisplayOrderStatus } from "@/components/order-status-display";
import { Heading } from "@/components/ui/heading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import { formatDateTime } from "@/utils/utils";
import type { OrderNote, orderitemview } from "@prisma/client";
import axios from "axios";
import { ClipLoader } from "react-spinners";

interface props {
	store: Store;
	orders: StoreOrder[];
	parentLoading: boolean;
}

/**
 * Component to display and ready-to-ship orders for a store.
 * Store operator can change status to Completed.
 * @param {Store} store - The store object containing store details.
 * @param {StoreOrder[]} orders - List of store orders (should be in in-progress status).
 * @param {boolean} parentLoading - Flag to determine if parent component is loading.
 *
 * @returns A UI component displaying the list of in-progress orders with options to mark order as in-shipping status.
 */

export const OrderReadyToShip = ({ store, orders, parentLoading }: props) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	//const params = useParams();
	//const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	if (parentLoading) {
		return <ClipLoader color="text-primary" />;
	}

	const handleChecked = async (orderId: string) => {
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/mark-as-completed/${orderId}`;
		await axios.post(url);

		// remove the order from the list
		orders.filter((order) => order.id !== orderId);

		toastSuccess({
			title: t("Order") + t("Updated"),
			description: "",
		});
	};

	if (!mounted) return <></>;

	return (
		<>
			<Card>
				<Heading
					title={t("Order_ready_to_ship")}
					description=""
					badge={orders.length}
					className="pt-2"
				/>

				<CardContent className="px-0 m-0">
					<div className="text-muted-foreground xs:text-xs">
						{orders.length === 0
							? t("no_results_found")
							: t("Order_ready_to_ship_descr")}
					</div>

					{orders.length !== 0 && (
						<Table>
							<TableHeader>
								<TableRow>
									{/*單號/桌號*/}
									<TableHead className="">{t("Order_number")}</TableHead>
									<TableHead className="">{t("Order_pickupCode")}</TableHead>
									<TableHead className="w-[200px]">
										{t("Order_items")}
									</TableHead>
									<TableHead>{t("Order_note")}</TableHead>
									<TableHead className="w-[90px] hidden lg:table-cell">
										{t("ordered_at")}
									</TableHead>
									<TableHead className="w-[90px] text-right">
										{t("Order_total")}
									</TableHead>
									<TableHead className="w-[80px] text-center">
										{t("Order_shipout")}
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{orders.map((order: StoreOrder) => (
									<TableRow key={order.id}>
										<TableCell className="lg:text-2xl font-extrabold">
											{order.orderNum}
										</TableCell>
										<TableCell className="lg:text-2xl font-extrabold">
											{order.pickupCode}
										</TableCell>
										<TableCell className="text-nowrap">
											{order.OrderItemView.map((item: orderitemview) => (
												<div
													key={item.id}
												>{`${item.name} x ${item.quantity}`}</div>
											))}
										</TableCell>

										<TableCell>
											<div className="flex gap-1 text-xs items-center">
												<div>
													{order.isPaid === true ? (
														<div className="text-green-700 dark:text-green-700">
															{t("isPaid")}
														</div>
													) : (
														<div className="text-red-400 dark:text-red-700">
															{t("isNotPaid")}
														</div>
													)}
												</div>
												<div>{order.ShippingMethod?.name}</div>
												<div className="hidden lg:table-cell">
													{order.PaymentMethod?.name}
												</div>
												<div>
													<DisplayOrderStatus status={order.orderStatus} />
												</div>
											</div>

											<div className="hidden lg:table-cell text-xs">
												{order.OrderNotes.map((note: OrderNote) => (
													<div key={note.id}>{note.note}</div>
												))}
												<div>{order.User?.name}</div>
											</div>
										</TableCell>

										<TableCell className="hidden lg:table-cell text-xs">
											{/*format(getDateInTz(new Date(order.updatedAt), store.defaultTimezone), "yyyy-MM-dd HH:mm:ss")*/}
											{formatDateTime(order.updatedAt)}
										</TableCell>

										<TableCell className="text-right text-2xl font-extrabold">
											<Currency value={Number(order.orderTotal)} />
										</TableCell>

										<TableCell className="bg-slate-200 dark:bg-slate-900 text-center">
											<Checkbox
												value={order.id}
												onClick={() => handleChecked(order.id)}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</>
	);
};
