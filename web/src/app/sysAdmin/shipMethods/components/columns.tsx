"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ShippingMethodColumn } from "../shipping-method-column";
import { CellAction } from "./cell-action";

interface CreateShippingMethodColumnsOptions {
	onUpdated?: (shippingMethod: ShippingMethodColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createShippingMethodColumns = (
	t: TFunction,
	options: CreateShippingMethodColumnsOptions = {},
): ColumnDef<ShippingMethodColumn>[] => {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Name" />
			),
		},
		{
			accessorKey: "basic_price",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Price" />
			),
			cell: ({ row }) => {
				const price = row.getValue("basic_price") as number;
				const currencyId = row.original.currencyId;
				return (
					<span>
						{new Intl.NumberFormat("en-US", {
							style: "currency",
							currency: (currencyId || "TWD").toUpperCase(),
							maximumFractionDigits: 2,
							minimumFractionDigits: 0,
						}).format(price)}
					</span>
				);
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
			accessorKey: "isDeleted",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Is Deleted" />
			),
			cell: ({ row }) => {
				const val = row.getValue("isDeleted") as boolean;
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
			accessorKey: "shipRequired",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Ship Required" />
			),
			cell: ({ row }) => {
				const val = row.getValue("shipRequired") as boolean;
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
			accessorKey: "stores",
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
			accessorKey: "Shipment",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="# of Shipments" />
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
