"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { IconCheck, IconX } from "@tabler/icons-react";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { CategoryColumn } from "../category-column";
import { CellAction } from "./cell-action";

interface CreateCategoryColumnsOptions {
	onDeleted?: (categoryId: string) => void;
	onUpdated?: (category: CategoryColumn) => void;
}

export const createCategoryColumns = (
	t: TFunction,
	options: CreateCategoryColumnsOptions = {},
): ColumnDef<CategoryColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Category_name")} />
			),
		},
		{
			accessorKey: "numOfProducts",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Category_numOfProduct")}
				/>
			),
		},
		{
			accessorKey: "isFeatured",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Category_isFeatured")}
				/>
			),
			cell: ({ row }) => {
				const isFeatured = row.getValue<boolean>("isFeatured") === true;
				return (
					<div className="pl-3">
						{isFeatured ? (
							<IconCheck className="text-green-500 size-4" />
						) : (
							<IconX className="text-red-500 size-4" />
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "sortOrder",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Category_sortOrder")}
				/>
			),
		},
		{
			id: "actions",
			header: () => t("actions"),
			cell: ({ row }) => (
				<CellAction
					data={row.original}
					onDeleted={onDeleted}
					onUpdated={onUpdated}
				/>
			),
		},
	];
};
