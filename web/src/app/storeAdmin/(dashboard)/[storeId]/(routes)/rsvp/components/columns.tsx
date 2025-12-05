"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { Rsvp } from "@/types";
import { CellAction } from "./cell-action";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";

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
				<DataTableColumnHeader column={column} title="Reservation Time" />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const rsvpTime = rsvp.rsvpTime;

				// Convert rsvpTime to Date object
				const rsvpTimeEpoch =
					typeof rsvpTime === "bigint"
						? rsvpTime
						: typeof rsvpTime === "number"
							? BigInt(rsvpTime)
							: rsvpTime instanceof Date
								? BigInt(rsvpTime.getTime())
								: null;

				if (!rsvpTimeEpoch) {
					return <span>-</span>;
				}

				const utcDate = epochToDate(rsvpTimeEpoch);
				if (!utcDate) {
					return <span>-</span>;
				}

				// Convert to store timezone for display
				const storeDate = getDateInTz(utcDate, getOffsetHours(storeTimezone));

				return <span>{format(storeDate, "PPP p")}</span>;
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
					storeTimezone={storeTimezone}
					rsvpSettings={rsvpSettings}
				/>
			),
		},
	];
};
