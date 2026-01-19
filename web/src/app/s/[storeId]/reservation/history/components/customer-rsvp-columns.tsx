"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import { IconPencil, IconX } from "@tabler/icons-react";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { cn } from "@/lib/utils";

import type { Rsvp } from "@/types";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";

interface CreateCustomerRsvpColumnsOptions {
	storeTimezone?: string;
	onStatusClick?: (e: React.MouseEvent, rsvp: Rsvp) => void;
	canCancelReservation?: (rsvp: Rsvp) => boolean;
	canEditReservation?: (rsvp: Rsvp) => boolean;
	onEditClick?: (rsvp: Rsvp) => void;
	onCheckoutClick?: (orderId: string) => void;
}

export const createCustomerRsvpColumns = (
	t: TFunction,
	options: CreateCustomerRsvpColumnsOptions = {},
): ColumnDef<Rsvp>[] => {
	const {
		storeTimezone = "Asia/Taipei",
		onStatusClick,
		canCancelReservation,
		canEditReservation,
		onEditClick,
		onCheckoutClick,
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

				// Convert to store timezone for display
				const storeDate = getDateInTz(
					utcDate,
					getOffsetHours(
						rsvp.Store?.defaultTimezone ?? storeTimezone ?? "Asia/Taipei",
					),
				);

				return (
					<span className="font-mono sm:text-sm">
						{format(storeDate, `${datetimeFormat} HH:mm`)}
					</span>
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
				const storeName = rsvp.Store?.name;
				const facilityName = rsvp.Facility?.facilityName;
				const serviceStaffName =
					rsvp.ServiceStaff?.User?.name ||
					rsvp.ServiceStaff?.User?.email ||
					null;

				// Build display parts array
				const parts: string[] = [];

				if (storeName) {
					parts.push(storeName);
				}
				if (facilityName) {
					parts.push(facilityName);
				}
				if (serviceStaffName) {
					parts.push(
						`${t("service_staff") || "Service Staff"}: ${serviceStaffName}`,
					);
				}

				if (parts.length === 0) {
					return <span className="sm:text-sm">-</span>;
				}

				return <span className="sm:text-sm">{parts.join(" - ")}</span>;
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
					<span className="sm:text-sm">
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
				const canEdit = canEditReservation?.(rsvp) ?? false;
				const canCancel = canCancelReservation?.(rsvp) ?? false;
				const isClickable = canEdit && onEditClick;
				return (
					<div className="flex items-center gap-1.5">
						<span
							onClick={(e) => {
								e.stopPropagation();
								if (isClickable) {
									onEditClick(rsvp);
								}
							}}
							title={
								isClickable
									? t("edit_reservation") || "Edit reservation"
									: undefined
							}
							className={cn(
								"inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded sm:font-mono",
								getRsvpStatusColorClasses(status, false),
								isClickable &&
									"cursor-pointer hover:opacity-80 transition-opacity",
							)}
						>
							<span className="font-medium">{t(`rsvp_status_${status}`)}</span>
						</span>
					</div>
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
				return (
					<span className="max-w-[200px] truncate sm:text-sm">
						{message || "-"}
					</span>
				);
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
				const rsvp = row.original;
				const paid = row.getValue("alreadyPaid") as boolean;

				// Calculate total cost
				const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
				const serviceStaffCost = rsvp.serviceStaffCost
					? Number(rsvp.serviceStaffCost)
					: 0;
				const total = facilityCost + serviceStaffCost;

				// Show green if already paid OR if total <= 0 (nothing to pay)
				const isPaid = paid || total <= 0;

				// Check if clickable (not paid, has orderId, and total > 0)
				const isClickable =
					!isPaid && rsvp.orderId && total > 0 && onCheckoutClick;

				return (
					<span className="flex items-center justify-center">
						<span
							onClick={(e) => {
								if (isClickable && rsvp.orderId) {
									e.stopPropagation();
									onCheckoutClick(rsvp.orderId);
								}
							}}
							title={
								isClickable
									? t("navigate_to_payment_page") || "Navigate to payment page"
									: undefined
							}
							className={cn(
								"h-2 w-2 rounded-full",
								isPaid ? "bg-green-500" : "bg-red-500",
								isClickable &&
									"cursor-pointer hover:opacity-80 transition-opacity",
							)}
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
					<span className="font-mono sm:text-sm">
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
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("actions")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const canEdit = canEditReservation?.(rsvp) ?? false;
				const canCancel = canCancelReservation?.(rsvp) ?? false;
				const isClickable = canEdit && onEditClick;
				return (
					<div className="flex items-center gap-1.5">
						{canEdit && onEditClick && (
							<IconPencil
								className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity text-blue-500"
								onClick={(e) => {
									e.stopPropagation();
									onEditClick(rsvp);
								}}
								title={t("edit_reservation") || "Edit reservation"}
							/>
						)}
						{canCancel && onStatusClick && (
							<IconX
								className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity text-red-500"
								onClick={(e) => {
									e.stopPropagation();
									onStatusClick(e, rsvp);
								}}
								title={t("cancel_reservation") || "Cancel reservation"}
							/>
						)}
					</div>
				);
			},
		},
	];
};
