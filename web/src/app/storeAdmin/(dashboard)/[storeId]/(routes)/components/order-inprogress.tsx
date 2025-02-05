"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

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
import { formatDateTime, getDateInTz } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import type { OrderNote, orderitemview } from "@prisma/client";
import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";
import { ClipLoader } from "react-spinners";

interface props {
	store: Store;
	autoAcceptOrder: boolean;
	orders: StoreOrder[];
	parentLoading: boolean;
}

export const OrderInProgress = ({
	store,
	autoAcceptOrder,
	orders,
	parentLoading,
}: props) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	//const params = useParams();
	//const router = useRouter();
	const { toast } = useToast();
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

		toast({
			title: t("Order") + t("Updated"),
			description: "",
			variant: "success",
		});
	};

	if (!mounted) return <></>;

	return (
		<>
			<div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
				<h4 className="mb-6 text-xl font-semibold text-black dark:text-primary">
					<Heading
						title={t("Order_accept_mgmt")}
						description=""
						badge={orders.length}
						className="pt-2"
					/>
				</h4>

				<div className="text-muted-foreground xs:text-xs">
					{orders.length === 0
						? t("no_results_found")
						: autoAcceptOrder // if true, 請勾選來完成訂單; else 請勾選來接單
							? t("Order_accept_mgmt_descr")
							: t("Order_accept_mgmt_descr2")}
				</div>

				{orders.length !== 0 && (
					<>
						<div className="flex flex-col">
							<div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
								<div className="p-2.5 xl:p-5">
									<h5 className="text-sm font-medium  xsm:text-base">
										{t("Order_number")}
									</h5>
								</div>
								<div className="p-2.5 text-center xl:p-5">
									<h5 className="text-sm font-medium  xsm:text-base">
										{t("Order_items")}
									</h5>
								</div>
								<div className="p-2.5 text-center xl:p-5">
									<h5 className="text-sm font-medium  xsm:text-base">
										{t("ordered_at")}
									</h5>
								</div>
								<div className="hidden p-2.5 text-center sm:block xl:p-5">
									<h5 className="text-sm font-medium  xsm:text-base">
										{t("Order_total")}
									</h5>
								</div>
								<div className="hidden p-2.5 text-center sm:block xl:p-5">
									<h5 className="text-sm font-medium  xsm:text-base">
										{autoAcceptOrder ? t("Order_accept") : t("Order_accept2")}
									</h5>
								</div>
							</div>
						</div>

						<Table>
							<TableBody>
								{orders.map((order: StoreOrder) => (
									<TableRow key={order.id}>
										<TableCell className="lg:text-2xl font-extrabold">
											{order.orderNum}
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
												<Button
													className="text-xs"
													variant={"outline"}
													size="sm"
												>
													<Link
														href={`/storeAdmin/${order.storeId}/order/${order.id}`}
													>
														{t("Order_Modify")}
													</Link>
												</Button>

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
					</>
				)}
			</div>
		</>
	);
};
