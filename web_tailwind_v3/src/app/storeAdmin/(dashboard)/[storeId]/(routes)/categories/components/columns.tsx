"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type CategoryColumn = {
	categoryId: string;
	storeId: string;
	name: string;
	isFeatured: boolean;
	sortOrder: number;
	numOfProducts: number;
};

export const columns: ColumnDef<CategoryColumn>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("Category_name")} />
			);
		},
		cell: ({ row }) => (
			<Link
				className="pl-0"
				title="click to edit"
				href={`./categories/${row.original.categoryId}`}
			>
				{row.getValue("name")}
			</Link>
		),
	},
	{
		accessorKey: "numOfProducts",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("Category_numofProduct")}
				/>
			);
		},
	},
	{
		accessorKey: "isFeatured",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("Category_isFeatured")}
				/>
			);
		},
		cell: ({ row }) => {
			//console.log( typeof(row.getValue("isFeatured")) );
			const isFeatured =
				row.getValue("isFeatured") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{isFeatured}</div>;
		},
	},
	{
		accessorKey: "sortOrder",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("Category_sortOrder")}
				/>
			);
		},
	},
	{
		id: "actions",
		header: ({ column }) => {
			return t("actions");
		},
		cell: ({ row }) => <CellAction data={row.original} />,
	},
];
