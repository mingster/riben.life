"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type StoreColumn = {
	id: string;
	name: string;
	customDomain: string;
	owner: string;
	level: string;
	customerCredit: number;
	createdAt: string;
	products: number;
	storeOrders: number;
};

export const columns: ColumnDef<StoreColumn>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Name" />;
		},
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<Link
					className="pl-5"
					title="edit this store"
					href={`./stores/${row.original.id}/`}
				>
					{row.getValue("name")}
				</Link>
				{row.original.customDomain ? (
					<Link
						target="_blank"
						className="pl-5"
						title="view this store domain"
						href={`https://${row.original.customDomain}`}
					>
						{row.original.customDomain}
					</Link>
				) : null}
			</div>
		),
	},
	{
		accessorKey: "level",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Level" />;
		},
	},
	{
		accessorKey: "owner",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="owner" />;
		},
	},
	{
		accessorKey: "customerCredit",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Customer credit" />;
		},
	},
	{
		accessorKey: "products",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="# of products" />;
		},
	},
	{
		accessorKey: "storeOrders",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="# of orders" />;
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Open since" />;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => <CellAction data={row.original} />,
	},
];
