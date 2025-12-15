"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { PaymentMethodColumn } from "../payment-method-column";
import { CellAction } from "./cell-action";

interface CreatePaymentMethodColumnsOptions {
	onUpdated?: (paymentMethod: PaymentMethodColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createPaymentMethodColumns = (
	t: TFunction,
	options: CreatePaymentMethodColumnsOptions = {},
): ColumnDef<PaymentMethodColumn>[] => {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Name" />
			),
		},
		{
			accessorKey: "fee",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fee (%)" />
			),
			cell: ({ row }) => {
				const fee = row.getValue("fee") as number;
				return <span>{(fee * 100).toFixed(2)}%</span>;
			},
		},
		{
			accessorKey: "feeAdditional",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fee Additional" />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "clearDays",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Clear Days" />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "isDefault",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Is Default" />
			),
			cell: ({ row }) => {
				const val = row.getValue("isDefault") as boolean;
				return val ? (
					<IconCheck className="text-green-400 size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "StorePaymentMethodMapping",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="# of Stores" />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "StoreOrder",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="# of Orders" />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			id: "actions",
			header: () => t("actions"),
			cell: ({ row }) => (
				<CellAction
					data={row.original}
					onUpdated={onUpdated}
					onDeleted={onDeleted}
				/>
			),
		},
	];
};
