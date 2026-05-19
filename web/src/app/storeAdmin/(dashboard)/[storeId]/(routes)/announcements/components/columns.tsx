"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { StoreAnnouncementLocale } from "@prisma/client";
import type { AnnouncementColumn } from "../announcement-column";
import { CellAction } from "./cell-action";
import { EditAnnouncementDialog } from "./edit-announcement-dialog";

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
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("name")} />
			),
			cell: ({ row }) => (
				<EditAnnouncementDialog item={row.original} onUpdated={onUpdated} />
			),
			enableHiding: false,
		},
		{
			accessorKey: "locales",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("locales")} />
			),
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.locales.map((l: StoreAnnouncementLocale) => (
						<Badge key={l.localeId} variant="secondary">
							{l.localeId.toUpperCase()}
						</Badge>
					))}
				</div>
			),
		},
		{
			accessorKey: "published",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("faq_published")} />
			),
			cell: ({ row }) =>
				row.getValue("published") ? (
					<IconCheck className="text-green-500 size-4" />
				) : (
					<IconX className="text-muted-foreground size-4" />
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
				<CellAction data={row.original} onDeleted={onDeleted} />
			),
		},
	];
};
