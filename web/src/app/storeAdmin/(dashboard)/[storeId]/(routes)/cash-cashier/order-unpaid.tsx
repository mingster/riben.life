"use client";

import { useEffect, useState } from "react";

import { toastError, toastSuccess } from "@/components/Toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { useTranslation } from "@/app/i18n/client";
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
import type { OrderNote, StoreTables, orderitemview } from "@prisma/client";
import axios from "axios";
import { ClipLoader } from "react-spinners";

import Currency from "@/components/currency";
import { DisplayOrderStatus } from "@/components/order-status-display";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/datetime-utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getTableName } from "@/lib/getTableName";
interface props {
	store: Store;
	tables: StoreTables[];
	orders: StoreOrder[];
	parentLoading: boolean;
}

export const OrderUnpaid = ({
	store,
	tables,
	orders,
	parentLoading,
}: props) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	//const [loading, setLoading] = useState(false);
	//const [open, setOpen] = useState(false);
	//const [selectedOrderId, setSelectedOrderId] = useState("");

	if (parentLoading) {
		return <ClipLoader color="text-primary" />;
	}

	const handleChecked = async (orderId: string) => {
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/cash-mark-as-paid/${orderId}`;
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
		<Card>
			<div className="flex justify-between">
				<Heading
					title={t("Order_unpiad_title")}
					description={orders.length !== 0 ? t("Order_unpiad_descr") : ""}
					badge={orders.length}
					className="pt-2"
				/>

				<Button
					variant={"outline"}
					onClick={() => router.push(`/storeAdmin/${params.storeId}/order/add`)}
				>
					<Plus className="mr-0 size-4" />
					{t("Create")}
				</Button>
			</div>

			<CardContent className="px-0 m-0">
				<div className="text-muted-foreground xs:text-xs">
					{orders.length === 0 ? t("no_results_found") : ""}
				</div>

				{orders.length !== 0 && (
					<Table>
						<TableHeader>
							<TableRow>
								{/*單號/桌號*/}
								<TableHead className="">{t("Order_number")}</TableHead>
								<TableHead className="w-[200px]">{t("Order_items")}</TableHead>
								<TableHead>{t("Order_note")}</TableHead>
								<TableHead className="w-[90px] hidden lg:table-cell">
									{t("ordered_at")}
								</TableHead>
								<TableHead className="w-[90px] text-right">
									{t("Order_total")}
								</TableHead>
								<TableHead className="w-[80px] text-center">
									{t("Order_cashier_confirm")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order: StoreOrder) => (
								<TableRow key={order.id}>
									<TableCell className="text-2xl font-extrabold">
										{order.orderNum}
										{order.tableId &&
											` / ${getTableName(tables, order.tableId)}`}
									</TableCell>

									<TableCell>
										{order.OrderItemView.map((item: orderitemview) => (
											<div
												key={item.id}
											>{`${item.name} x ${item.quantity}`}</div>
										))}
									</TableCell>

									<TableCell>
										<div className="flex gap-1 text-xs items-center">
											<Button className="text-xs" variant={"outline"} size="sm">
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
				)}
			</CardContent>
		</Card>
	);
};
