"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { RsvpColumn } from "../history/rsvp-column";
import { CellAction } from "./cell-action";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

interface CreateRsvpColumnsOptions {
	onDeleted?: (rsvpId: string) => void;
	onUpdated?: (rsvp: RsvpColumn) => void;
}

export const createRsvpColumns = (
	t: TFunction,
	options: CreateRsvpColumnsOptions = {},
): ColumnDef<RsvpColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "rsvpTime",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Reservation Time" />
			),
			cell: ({ row }) => {
				const date = row.getValue("rsvpTime") as Date;
				return <span>{format(date, "PPP p")}</span>;
			},
		},
		{
			accessorKey: "numOfAdult",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Adults" />
			),
			cell: ({ row }) => <span>{row.getValue("numOfAdult") as number}</span>,
		},
		{
			accessorKey: "numOfChild",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Children" />
			),
			cell: ({ row }) => <span>{row.getValue("numOfChild") as number}</span>,
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => <span>{row.getValue("status") as number}</span>,
		},
		{
			accessorKey: "message",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Message" />
			),
			cell: ({ row }) => {
				const message = row.getValue("message") as string | null;
				return <span className="max-w-[200px] truncate">{message || "-"}</span>;
			},
		},
		{
			accessorKey: "alreadyPaid",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Paid" />
			),
			cell: ({ row }) => {
				const paid = row.getValue("alreadyPaid") as boolean;
				return <span>{paid ? "Yes" : "No"}</span>;
			},
		},
		{
			id: "actions",
			header: ({ column }) => <div className="text-xs">{t("actions")}</div>,
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
