"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { AnnouncementColumn } from "../announcement-column";
import { CellAction } from "./cell-action";

interface CreateAnnouncementColumnsOptions {
	onUpdated?: (announcement: AnnouncementColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createAnnouncementColumns = (
	t: TFunction,
	options: CreateAnnouncementColumnsOptions = {},
): ColumnDef<AnnouncementColumn>[] => {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "message",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("announcement_body")} />
			),
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("updated")} />
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
