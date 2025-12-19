"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { cn } from "@/lib/utils";

import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { CellAction } from "./cell-action";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";

interface CreateRsvpColumnsOptions {
	onDeleted?: (rsvpId: string) => void;
	onUpdated?: (rsvp: Rsvp) => void;
	storeTimezone?: string;
	rsvpSettings?: {
		prepaidRequired?: boolean | null;
	} | null;
}

export const createRsvpColumns = (
	t: TFunction,
	options: CreateRsvpColumnsOptions = {},
): ColumnDef<Rsvp>[] => {
	const {
		onDeleted,
		onUpdated,
		storeTimezone = "Asia/Taipei",
		rsvpSettings,
	} = options;

	return [
		{
			accessorKey: "rsvpTime",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_time")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const rsvpTime = rsvp.rsvpTime;
				const datetimeFormat = t("datetime_format");

				// Convert rsvpTime to Date object
				const rsvpTimeEpoch =
					typeof rsvpTime === "number"
						? BigInt(rsvpTime)
						: rsvpTime instanceof Date
							? BigInt(rsvpTime.getTime())
							: rsvpTime;

				const utcDate = epochToDate(rsvpTimeEpoch) ?? new Date();

				// Convert to store timezone for display (use store's timezone if available, otherwise fall back to provided storeTimezone)
				const storeDate = getDateInTz(
					utcDate,
					getOffsetHours(
						rsvp.Store?.defaultTimezone ?? storeTimezone ?? "Asia/Taipei",
					),
				);

				return (
					<span className="font-mono">
						{format(storeDate, `${datetimeFormat} HH:mm`)}
					</span>
				);
			},
		},
		{
			id: "customerName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("customer")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				return <span>{rsvp.Customer?.name || "-"}</span>;
			},
		},
		{
			id: "numOfGuest",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_num_of_guest")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const numOfAdult = rsvp.numOfAdult || 0;
				const numOfChild = rsvp.numOfChild || 0;
				return (
					<span>
						{t("rsvp_num_of_guest_val", {
							adult: numOfAdult,
							child: numOfChild,
						})}
					</span>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_status")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const status = rsvp.status;
				return (
					<span
						className={cn(
							"inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-mono",
							getRsvpStatusColorClasses(status, false),
						)}
					>
						<span className="font-medium">{t(`rsvp_status_${status}`)}</span>
					</span>
				);
			},
		},
		{
			accessorKey: "message",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_message")} />
			),
			cell: ({ row }) => {
				const message = row.getValue("message") as string | null;
				return <span className="max-w-[200px] truncate">{message || "-"}</span>;
			},
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "alreadyPaid",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_already_paid")} />
			),
			cell: ({ row }) => {
				const paid = row.getValue("alreadyPaid") as boolean;
				return (
					<span className="flex items-center justify-center">
						<span
							className={`h-2 w-2 rounded-full ${
								paid ? "bg-green-500" : "bg-red-500"
							}`}
						/>
					</span>
				);
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
					storeTimezone={storeTimezone}
					rsvpSettings={rsvpSettings}
				/>
			),
		},
	];
};
