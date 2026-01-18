"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { DisplayOrderStatus } from "@/components/display-order-status";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import Link from "next/link";
import type { TransactionColumn } from "../transaction-column";
import { CellAction } from "./cell-action";

interface CreateTransactionColumnsOptions {
	storeId?: string;
}

export const createTransactionColumns = (
	t: TFunction,
	options: CreateTransactionColumnsOptions = {},
): ColumnDef<TransactionColumn>[] => {
	const { storeId } = options;
	const dateFormat = t("datetime_format");
	return [
		{
			accessorKey: "amount",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("order_total")} />
			),
			cell: ({ row }) => {
				const amount = Number(row.getValue("amount"));
				return <Currency value={amount} />;
			},
		},
		{
			accessorKey: "orderStatus",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("order_status")} />
			),
			cell: ({ row }) => (
				<DisplayOrderStatus status={row.getValue("orderStatus")} />
			),
		},
		{
			accessorKey: "isPaid",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("order_is_paid")} />
			),
			cell: ({ row }) =>
				row.getValue("isPaid") === true ? (
					<Badge variant="default" className="bg-green-600 hover:bg-green-600">
						{t("is_paid")}
					</Badge>
				) : (
					<Badge variant="destructive">{t("is_not_paid")}</Badge>
				),
		},
		{
			accessorKey: "paymentMethod",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("payment_method")} />
			),
			meta: {
				className: "whitespace-nowrap hidden sm:table-cell",
			},
		},
		{
			accessorKey: "shippingMethod",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("shipping_method")} />
			),
			meta: {
				className: "whitespace-nowrap hidden sm:table-cell",
			},
		},
		{
			accessorKey: "orderNum",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("order_order_num")} />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<div className="hidden sm:block">
					<DataTableColumnHeader column={column} title={t("updated")} />
				</div>
			),
			cell: ({ row }) => {
				const transaction = row.original;
				if (!transaction.updatedAtIso) return "-";
				const date = new Date(transaction.updatedAtIso);
				if (isNaN(date.getTime())) return transaction.updatedAt;
				return <span>{format(date, dateFormat)}</span>;
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			id: "info",
			header: () => {
				return t("note");
			},
			cell: ({ row }) => <InfoColumn data={row.original} />,
		},
		{
			id: "actions",
			cell: ({ row }) => <CellAction data={row.original} />,
		},
	];
};

interface InfoColumnProps {
	data: TransactionColumn;
}

export function InfoColumn({ data }: InfoColumnProps) {
	const { storeId } = data;
	const userEmail = data.userEmail;
	const userName = data.user;

	return (
		<div className="flex flex-col gap-1 overflow-hidden text-clip">
			<div>
				{data.orderItems.map((item) => (
					<div key={item.id} className="text-xs">
						{item.name} × {item.quantity}
					</div>
				))}
			</div>
			<div>
				{userEmail && storeId ? (
					<Link
						href={`/storeAdmin/${storeId}/customers/${userEmail}`}
						className="text-primary hover:underline"
					>
						{userName}
					</Link>
				) : (
					<span>{userName}</span>
				)}
			</div>
		</div>
	);
}
