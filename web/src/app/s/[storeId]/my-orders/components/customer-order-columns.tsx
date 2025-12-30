"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import Currency from "@/components/currency";
import { DisplayOrderStatus } from "@/components/display-order-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

import type { StoreOrder } from "@/types";
import type { orderitemview } from "@prisma/client";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";

interface CreateCustomerOrderColumnsOptions {
	storeTimezone?: string;
}

export const createCustomerOrderColumns = (
	t: TFunction,
	options: CreateCustomerOrderColumnsOptions = {},
): ColumnDef<StoreOrder>[] => {
	const { storeTimezone = "Asia/Taipei" } = options;

	return [
		{
			accessorKey: "orderNum",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_orderNum")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				return (
					<span className="font-mono text-xs sm:text-sm font-semibold">
						{order.orderNum || "-"}
					</span>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "orderTotal",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_total")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				let total = Number(order.orderTotal ?? 0);
				const isRefunded = order.orderStatus === Number(OrderStatus.Refunded);
				if (isRefunded) {
					total = -Number(order.orderTotal);
				}
				return <Currency value={total} />;
			},
		},
		{
			accessorKey: "orderStatus",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_status")} />
			),
			cell: ({ row }) => (
				<DisplayOrderStatus status={row.getValue("orderStatus")} className="" />
			),
		},
		{
			accessorKey: "paymentStatus",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_isPaid")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				const paymentStatus = order.paymentStatus;

				let statusText: string;
				let statusClass: string;

				switch (paymentStatus) {
					case Number(PaymentStatus.Paid):
						statusText = t("PaymentStatus_Paid");
						statusClass =
							"bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300";
						break;
					case Number(PaymentStatus.Refunded):
						statusText = t("PaymentStatus_Refunded");
						statusClass =
							"bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
						break;
					case Number(PaymentStatus.PartiallyRefunded):
						statusText = t("PaymentStatus_PartiallyRefunded");
						statusClass =
							"bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
						break;
					case Number(PaymentStatus.Authorized):
						statusText = t("PaymentStatus_Authorized");
						statusClass =
							"bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
						break;
					case Number(PaymentStatus.SelfPickup):
						statusText = t("PaymentStatus_SelfPickup");
						statusClass =
							"bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
						break;
					case Number(PaymentStatus.Voided):
						statusText = t("PaymentStatus_Voided");
						statusClass =
							"bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
						break;
					case Number(PaymentStatus.Pending):
						statusText = t("PaymentStatus_Pending");
						statusClass =
							"bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
						break;
					default:
						statusText = t("PaymentStatus_NoPayment");
						statusClass =
							"bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
						break;
				}

				return (
					<Button
						variant="outline"
						className={cn("cursor-default", statusClass)}
						size="sm"
					>
						{statusText}
					</Button>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			id: "paymentMethod",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("paymentMethod_name")}
				/>
			),
			cell: ({ row }) => {
				const order = row.original;
				const paymentMethodName = order.PaymentMethod?.name;

				if (!paymentMethodName || paymentMethodName === "TBD") {
					return (
						<span className="text-xs sm:text-sm text-muted-foreground">
							{paymentMethodName}
						</span>
					);
				}

				return <span className="text-xs sm:text-sm">{paymentMethodName}</span>;
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			id: "items",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("items")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				const items = order.OrderItemView || [];

				if (items.length === 0) {
					return (
						<span className="text-xs sm:text-sm text-muted-foreground">
							{t("items")}
						</span>
					);
				}

				// Display item names, truncate if too long
				const itemNames = items
					.map((item: orderitemview) => item.name)
					.join(", ");
				const maxLength = 50; // Maximum characters to display

				return (
					<div className="text-xs sm:text-sm">
						{items.length > 1 && (
							<span className="text-muted-foreground mr-1">
								{items.length}x{" "}
							</span>
						)}
						<span
							className="truncate block"
							title={itemNames} // Show full names on hover
						>
							{itemNames.length > maxLength
								? `${itemNames.substring(0, maxLength)}...`
								: itemNames}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("created_at")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				const updatedAt = order.updatedAt;
				const datetimeFormat = t("datetime_format");

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

				return (
					<span className="font-mono text-xs sm:text-sm">
						{format(storeDate, `${datetimeFormat} HH:mm`)}
					</span>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const order = row.original;
				return (
					<Button variant="outline" size="sm" asChild>
						<Link href={`/order/${order.id}`}>{t("view") || "View"}</Link>
					</Button>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
	];
};
