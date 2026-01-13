"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import { createCustomerOrderColumns } from "./customer-order-columns";
import { DisplayOrderStatus } from "@/components/display-order-status";
import Currency from "@/components/currency";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { orderitemview } from "@prisma/client";

interface ClientMyOrdersProps {
	serverData: StoreOrder[];
	storeTimezone: string;
}

export const ClientMyOrders: React.FC<ClientMyOrdersProps> = ({
	serverData,
	storeTimezone,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [data] = useState<StoreOrder[]>(serverData);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	const columns = useMemo(
		() => createCustomerOrderColumns(t, { storeTimezone }),
		[t, storeTimezone],
	);

	if (!data || data.length === 0) {
		return (
			<>
				<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Heading
						title={t("my_orders") || "My Orders"}
						badge={0}
						description=""
					/>
				</div>
				<Separator />
				<div className="text-center py-8 text-muted-foreground">
					<span className="text-2xl font-mono">{t("no_result")}</span>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("my_orders") || "My Orders"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<div className="space-y-3 sm:space-y-4">
				{/* Mobile: Card view */}
				<div className="block sm:hidden space-y-3">
					{data.map((order) => {
						const items = order.OrderItemView || [];
						const itemNames = items
							.map((item: orderitemview) => item.name)
							.join(", ");
						const maxLength = 50;
						const displayItemNames =
							itemNames.length > maxLength
								? `${itemNames.substring(0, maxLength)}...`
								: itemNames;

						const updatedAt = order.updatedAt;
						const utcDate =
							epochToDate(
								typeof updatedAt === "number"
									? BigInt(updatedAt)
									: updatedAt instanceof Date
										? BigInt(updatedAt.getTime())
										: updatedAt,
							) ?? new Date();

						const storeDate = getDateInTz(
							utcDate,
							getOffsetHours(
								order.Store?.defaultTimezone ?? storeTimezone ?? "Asia/Taipei",
							),
						);

						let total = Number(order.orderTotal ?? 0);
						const isRefunded =
							order.orderStatus === Number(OrderStatus.Refunded);
						if (isRefunded) {
							total = -Number(order.orderTotal);
						}

						const paymentStatus = order.paymentStatus;
						let paymentStatusText: string;
						let paymentStatusClass: string;

						switch (paymentStatus) {
							case Number(PaymentStatus.Paid):
								paymentStatusText = t("payment_status_paid");
								paymentStatusClass =
									"bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300";
								break;
							case Number(PaymentStatus.Refunded):
								paymentStatusText = t("payment_status_refunded");
								paymentStatusClass =
									"bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
								break;
							case Number(PaymentStatus.PartiallyRefunded):
								paymentStatusText = t("payment_status_partially_refunded");
								paymentStatusClass =
									"bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
								break;
							case Number(PaymentStatus.Authorized):
								paymentStatusText = t("payment_status_authorized");
								paymentStatusClass =
									"bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
								break;
							case Number(PaymentStatus.SelfPickup):
								paymentStatusText = t("payment_status_self_pickup");
								paymentStatusClass =
									"bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
								break;
							case Number(PaymentStatus.Voided):
								paymentStatusText = t("payment_status_voided");
								paymentStatusClass =
									"bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
								break;
							case Number(PaymentStatus.Pending):
								paymentStatusText = t("payment_status_pending");
								paymentStatusClass =
									"bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
								break;
							default:
								paymentStatusText = t("payment_status_no_payment");
								paymentStatusClass =
									"bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
								break;
						}

						return (
							<div
								key={order.id}
								className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 text-xs"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm sm:text-base truncate font-mono">
											{order.orderNum || "-"}
										</div>
										<div className="text-muted-foreground text-[10px]">
											{format(storeDate, `${datetimeFormat} HH:mm`)}
										</div>
									</div>
									<div className="shrink-0 flex flex-col gap-1.5 items-end">
										<DisplayOrderStatus
											status={order.orderStatus}
											className="text-xs"
										/>
										<Button
											variant="outline"
											className={cn(
												"cursor-default text-[10px] px-2 py-0.5 h-auto",
												paymentStatusClass,
											)}
											size="sm"
										>
											{paymentStatusText}
										</Button>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t">
									<div className="space-y-1 flex-1 min-w-0">
										<div className="text-[10px] text-muted-foreground">
											{t("items")}
										</div>
										<div className="text-xs truncate" title={itemNames}>
											{items.length > 1 && (
												<span className="text-muted-foreground mr-1">
													{items.length}x{" "}
												</span>
											)}
											{displayItemNames || "-"}
										</div>
									</div>

									<div className="space-y-1 text-right shrink-0">
										<div className="text-[10px] text-muted-foreground">
											{t("order_total")}
										</div>
										<div className="font-semibold text-base">
											<Currency value={total} />
										</div>
									</div>
								</div>

								{order.PaymentMethod?.name &&
									order.PaymentMethod.name !== "TBD" && (
										<div className="text-[10px] text-muted-foreground pt-2 border-t">
											<span className="font-medium">
												{t("payment_method_name")}:
											</span>{" "}
											{order.PaymentMethod.name}
										</div>
									)}

								<div className="pt-2 border-t">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="w-full h-10"
									>
										<Link href={`/order/${order.id}`}>
											{t("view") || "View"}
										</Link>
									</Button>
								</div>
							</div>
						);
					})}
				</div>

				{/* Desktop: Table view */}
				<div className="hidden sm:block">
					<DataTable<StoreOrder, unknown>
						columns={columns}
						data={data}
						searchKey="orderNum"
					/>
				</div>
			</div>
		</>
	);
};
