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
		},
		{
			accessorKey: "orderTotal",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_total")} />
			),
			cell: ({ row }) => {
				const order = row.original;
				const total = Number(order.orderTotal ?? 0);
				return <Currency value={total} />;
			},
		},
		{
			accessorKey: "orderStatus",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_status")} />
			),
			cell: ({ row }) => (
				<DisplayOrderStatus status={row.getValue("orderStatus")} />
			),
		},
		{
			accessorKey: "isPaid",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Order_isPaid")} />
			),
			cell: ({ row }) => {
				const isPaid = row.getValue("isPaid") === true;
				return (
					<Button
						variant="outline"
						className={cn(
							"cursor-default",
							isPaid
								? "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
								: "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300",
						)}
						size="sm"
					>
						{isPaid ? t("isPaid") : t("isNotPaid")}
					</Button>
				);
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
				return (
					<span className="text-xs sm:text-sm">
						{items.length} {t("items")}
					</span>
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
		},
	];
};
