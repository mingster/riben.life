"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { StoreOrder } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type UserColumn = {
	id: string;
	name: string;
	username: string;
	email: string;
	role: string;
	createdAt: string;
	orders: StoreOrder[];
	currentlySignedIn: boolean;
};

export const columns: ColumnDef<UserColumn>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Name" />;
		},
		cell: ({ row }) => (
			<Link
				className="pl-5"
				title="view and reply the ticket"
				href={`./users/${row.original.id}/`}
			>
				{row.getValue("name")}
			</Link>
		),
	},
	{
		accessorKey: "username",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Username" />;
		},
	},
	{
		accessorKey: "email",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="E-mail" />;
		},
	},
	{
		accessorKey: "role",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Role" />;
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Member since" />;
		},
	},
	{
		accessorKey: "currentlySignedIn",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Signed In?" />;
		},
		cell: ({ row }) => {
			//console.log( typeof(row.getValue("isRecurring")) );
			const currentlySignedIn =
				row.getValue("currentlySignedIn") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{currentlySignedIn}</div>;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => <CellAction data={row.original} />,
	},
];
