"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
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
			accessorKey: "numOfAdult",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_num_of_adult")} />
			),
			cell: ({ row }) => <span>{row.getValue("numOfAdult") as number}</span>,
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "numOfChild",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_num_of_child")} />
			),
			cell: ({ row }) => <span>{row.getValue("numOfChild") as number}</span>,
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
						className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
							status === RsvpStatus.Pending
								? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
								: rsvp.alreadyPaid
									? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
									: rsvp.confirmedByStore || rsvp.confirmedByCustomer
										? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
										: status === RsvpStatus.Seated ||
												status === RsvpStatus.Completed
											? "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
											: status === RsvpStatus.Cancelled
												? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
												: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
						}`}
					>
						{t(`rsvp_status_${status}`)}
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
