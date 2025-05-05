"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Button } from "@/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type FaqColumn = {
	id: string;
	categoryId: string;
	category: string;
	question: string;
	//answer: string;
	sortOrder: number;
};

export const columns: ColumnDef<FaqColumn>[] = [
	{
		accessorKey: "category",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					{t("FaqCategory")}
					<CaretSortIcon className="ml-2 size-4" />
				</Button>
			);
		},
		cell: ({ row }) => (
			<div className="">
				<Link className="" title="back to the category" href={"../"}>
					{row.getValue("category")}
				</Link>
			</div>
		),
	},

	{
		accessorKey: "question",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title={t("FAQ")} />;
		},
		cell: ({ row }) => (
			<div className="">
				<Link className="" title="edit this FAQ" href={"./faq/${data.id}"}>
					{row.getValue("question")}
				</Link>
			</div>
		),
	},
	{
		accessorKey: "sortOrder",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title={t("sortOrder")} />;
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
