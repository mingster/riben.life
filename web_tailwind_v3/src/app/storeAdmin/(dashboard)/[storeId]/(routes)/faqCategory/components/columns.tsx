"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type FaqCategoryColumn = {
	faqCategoryId: string;
	storeId: string;
	name: string;
	sortOrder: number;
	faqCount: number;
};

export const columns: ColumnDef<FaqCategoryColumn>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("FaqCategory_name")} />
			);
		},
		cell: ({ row }) => (
			<Link
				className="pl-5"
				title="edit this category"
				href={`./faqCategory/${row.original.faqCategoryId}`}
			>
				{row.getValue("name")}
			</Link>
		),
	},
	{
		accessorKey: "sortOrder",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("FaqCategory_sortOrder")}
				/>
			);
		},
	},

	{
		accessorKey: "faqCount",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("FaqCategory_numofFaq")}
				/>
			);
		},
		cell: ({ row }) => (
			<Link
				className="pl-5"
				title="view the FAQ in this category"
				href={`./faqCategory/${row.original.faqCategoryId}/faq`}
			>
				{row.getValue("faqCount")}
			</Link>
		),
	},
	{
		id: "actions",
		header: ({ column }) => {
			return t("actions");
		},
		cell: ({ row }) => <CellAction data={row.original} />,
	},
];
