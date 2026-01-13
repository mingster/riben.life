"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { cn } from "@/lib/utils";

import type { Rsvp } from "@/types";
import { CellAction } from "./cell-action";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import Link from "next/link";

interface CreateRsvpColumnsOptions {
	onDeleted?: (rsvpId: string) => void;
	onUpdated?: (rsvp: Rsvp) => void;
	storeTimezone?: string;
	storeId?: string;
	rsvpSettings?: {
		minPrepaidPercentage?: number | null;
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
		storeId,
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
				const customer = rsvp.Customer;
				const customerName = customer?.name || "-";
				const email = customer?.email;

				if (!email || !storeId) {
					return <span>{customerName}</span>;
				}

				return email ? (
					<Link
						href={`/storeAdmin/${storeId}/customers/${email}`}
						className="text-primary hover:underline"
					>
						{customerName}
					</Link>
				) : (
					<span>{customerName}</span>
				);
			},
		},
		{
			id: "facilityName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("facility_name")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				let facilityName = rsvp.Facility?.facilityName;

				if (!facilityName) {
					facilityName = "-";
				}

				return <span>{facilityName}</span>;
			},
			meta: {
				className: "hidden sm:table-cell",
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
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("created_at")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const createdAt = rsvp.createdAt;
				const datetimeFormat = t("datetime_format");

				// Convert createdAt to Date object
				const createdAtEpoch =
					typeof createdAt === "number"
						? BigInt(createdAt)
						: createdAt instanceof Date
							? BigInt(createdAt.getTime())
							: createdAt;

				const utcDate = epochToDate(createdAtEpoch) ?? new Date();

				// Convert to store timezone for display
				const storeDate = getDateInTz(
					utcDate,
					getOffsetHours(
						rsvp.Store?.defaultTimezone ?? storeTimezone ?? "Asia/Taipei",
					),
				);

				return (
					<span className="font-mono text-xs sm:text-sm">
						{format(storeDate, `${datetimeFormat} HH:mm`)}
					</span>
				);
			},
			meta: {
				className: "hidden sm:table-cell",
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
