"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { RsvpBlacklistColumn } from "./rsvp-blacklist-column";
import { CellAction } from "./rsvp-blacklist-cell-action";
import { EditRsvpBlacklistDialog } from "./edit-rsvp-blacklist-dialog";

interface CreateRsvpBlacklistColumnsOptions {
	onDeleted?: (blacklistId: string) => void;
	onUpdated?: (blacklist: RsvpBlacklistColumn) => void;
}

export const createRsvpBlacklistColumns = (
	t: TFunction,
	options: CreateRsvpBlacklistColumnsOptions = {},
): ColumnDef<RsvpBlacklistColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "userName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("name")} />
			),
			cell: ({ row }) => {
				const userName = row.getValue("userName") as string | null;
				const userEmail = row.original.userEmail;
				return (
					<div className="flex items-center gap-2">
						<EditRsvpBlacklistDialog
							blacklist={row.original}
							onUpdated={onUpdated}
							trigger={
								<button
									type="button"
									className="text-left hover:underline cursor-pointer font-medium"
								>
									{userName || userEmail || row.original.userId}
								</button>
							}
						/>
					</div>
				);
			},
		},
		{
			accessorKey: "userEmail",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("user_email")} />
			),
			cell: ({ row }) => {
				const email = row.getValue("userEmail") as string | null;
				return <span>{email || "-"}</span>;
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("created_at") || "Created At"}
				/>
			),
			cell: ({ row }) => {
				const createdAt = row.getValue("createdAt") as bigint;
				const date = new Date(Number(createdAt));
				return (
					<span className="text-sm text-muted-foreground">
						{date.toLocaleString()}
					</span>
				);
			},
		},
		{
			id: "actions",
			header: () => <div className="text-xs">{t("actions")}</div>,
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
