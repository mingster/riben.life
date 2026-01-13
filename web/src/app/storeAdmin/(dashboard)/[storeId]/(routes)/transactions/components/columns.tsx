"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { DisplayOrderStatus } from "@/components/display-order-status";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
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
					<Button variant="outline" className="mr-2 cursor-default" size="sm">
						{t("is_paid")}
					</Button>
				) : (
					<Button
						variant="outline"
						className="mr-2 bg-red-900 text-gray cursor-default"
						size="sm"
					>
						{t("is_not_paid")}
					</Button>
				),
		},
		{
			accessorKey: "paymentMethod",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("payment_method")} />
			),
		},
		{
			accessorKey: "shippingMethod",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("shipping_method")} />
			),
		},
		{
			accessorKey: "orderNum",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("order_order_num")} />
			),
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("updated")} />
			),
		},
		{
			id: "info",
			header: () => "info",
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
		<div className="flex flex-col gap-1 text-nowrap">
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
