"use client";

import { IconCheck, IconX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";
import type { PaymentMethodColumn } from "../payment-method-column";
import { CellAction } from "./cell-action";

interface CreatePaymentMethodColumnsOptions {
	onUpdated?: (paymentMethod: PaymentMethodColumn) => void;
	onDeleted?: (id: string) => void;
	/** Lowercased plugin identifiers registered in code (e.g. stripe, linepay). */
	registeredPluginIds?: ReadonlySet<string>;
}

export const createPaymentMethodColumns = (
	t: TFunction,
	options: CreatePaymentMethodColumnsOptions = {},
): ColumnDef<PaymentMethodColumn>[] => {
	const { onUpdated, onDeleted, registeredPluginIds } = options;

	return [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Name" />
			),
		},
		{
			id: "pluginCode",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Plugin (code)" />
			),
			cell: ({ row }) => {
				const payUrl = (row.original.payUrl ?? "").trim().toLowerCase();
				if (!payUrl) {
					return <span className="text-muted-foreground">—</span>;
				}
				const registered = registeredPluginIds?.has(payUrl) ?? false;
				return registered ? (
					<Badge variant="secondary">Registered</Badge>
				) : (
					<Badge variant="outline">No plugin</Badge>
				);
			},
			meta: {
				className: "hidden md:table-cell",
			},
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
			accessorKey: "visibleToCustomer",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Visible To Customer" />
			),
			cell: ({ row }) => {
				const val = row.getValue("visibleToCustomer") as boolean;
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
			accessorKey: "platformEnabled",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Platform on" />
			),
			cell: ({ row }) => {
				const val = row.getValue("platformEnabled") as boolean;
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
