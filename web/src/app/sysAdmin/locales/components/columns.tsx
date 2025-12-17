"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { LocaleColumn } from "../locale-column";
import { CellAction } from "./cell-action";

interface CreateLocaleColumnsOptions {
	onUpdated?: (locale: LocaleColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createLocaleColumns = (
	t: TFunction,
	options: CreateLocaleColumnsOptions = {},
): ColumnDef<LocaleColumn>[] => {
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
			accessorKey: "lng",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Language Code" />
			),
		},
		{
			accessorKey: "defaultCurrencyId",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Default Currency" />
			),
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
