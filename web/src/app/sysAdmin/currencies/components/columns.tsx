"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { CurrencyColumn } from "../currency-column";
import { CellAction } from "./cell-action";

interface CreateCurrencyColumnsOptions {
	onUpdated?: (currency: CurrencyColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createCurrencyColumns = (
	t: TFunction,
	options: CreateCurrencyColumnsOptions = {},
): ColumnDef<CurrencyColumn>[] => {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "id",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
		},
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Name" />
			),
		},
		{
			accessorKey: "symbolNative",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Native Symbol" />
			),
		},
		{
			accessorKey: "demonym",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Demonym" />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "ISOnum",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ISO Number" />
			),
			meta: {
				className: "hidden md:table-cell",
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
