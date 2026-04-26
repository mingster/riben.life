"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { RsvpCalendarExportButtons } from "@/components/rsvp-calendar-export-buttons";
import { cn } from "@/lib/utils";

import Link from "next/link";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	toBigIntEpochUnknown,
} from "@/utils/datetime-utils";
import { getRsvpConversationMessage } from "@/utils/rsvp-conversation-utils";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";

interface CreateCustomerRsvpColumnsOptions {
	storeTimezone?: string;
	onStatusClick?: (e: React.MouseEvent, rsvp: Rsvp) => void;
	canCancelReservation?: (rsvp: Rsvp) => boolean;
	canEditReservation?: (rsvp: Rsvp) => boolean;
	onEditClick?: (rsvp: Rsvp) => void;
	onCheckoutClick?: (orderId: string) => void;
	onCustomerConfirmClick?: (rsvp: Rsvp) => void;
	/** When true, hides the actions column */
	hideActions?: boolean;
	/** Store history: show Google + ICS export column */
	showCalendarExport?: boolean;
	/** Single-line address for calendar LOCATION */
	calendarLocation?: string;
	/** Store admin mode: show confirm action for ReadyToConfirm rows */
	showStoreAdminConfirmAction?: boolean;
	/** When true, store name uses edit handler for ReadyToConfirm (matches mobile cards) */
	storeAdminList?: boolean;
}

function getRsvpStatusLabel(
	t: TFunction,
	status: number,
	isStoreAdminView: boolean,
): string {
	if (!isStoreAdminView) {
		if (status === RsvpStatus.ReadyToConfirm) {
			return t("rsvp_status_customer_10") || t(`rsvp_status_${status}`);
		}
		if (status === RsvpStatus.ConfirmedByCustomer) {
			return t("rsvp_status_customer_41") || t(`rsvp_status_${status}`);
		}
	}
	return t(`rsvp_status_${status}`);
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
		onCustomerConfirmClick,
		hideActions = false,
		showCalendarExport = false,
		calendarLocation,
		showStoreAdminConfirmAction = false,
		storeAdminList = false,
	} = options;

	const baseColumns: ColumnDef<Rsvp>[] = [
		{
			accessorKey: "rsvpTime",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_time")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const rsvpTime = rsvp.rsvpTime;
				const datetimeFormat = t("datetime_format");

				const rsvpTimeEpoch = toBigIntEpochUnknown(rsvpTime);

				const utcDate = epochToDate(rsvpTimeEpoch) ?? new Date();
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
				const storeId = rsvp.Store?.id;
				const storeName = rsvp.Store?.name;
				const facilityId = rsvp.Facility?.id;
				const facilityName = rsvp.Facility?.facilityName;
				const serviceStaffUser = rsvp.ServiceStaff?.User as
					| { name: string | null; email?: string | null }
					| undefined;
				const serviceStaffName =
					serviceStaffUser?.name || serviceStaffUser?.email || null;

				const parts: React.ReactNode[] = [];
				const canOpenRsvpTitleEdit =
					(canEditReservation?.(rsvp) ?? false) ||
					(storeAdminList && rsvp.status === RsvpStatus.ReadyToConfirm);
				if (storeName) {
					parts.push(
						storeId && canOpenRsvpTitleEdit && onEditClick ? (
							<button
								type="button"
								key="store"
								onClick={(e) => {
									e.stopPropagation();
									void onEditClick(rsvp);
								}}
								title={t("edit_reservation") || "Edit reservation"}
								className="p-0 h-auto min-h-0 font-inherit text-left bg-transparent border-0 hover:underline text-primary cursor-pointer sm:text-sm"
							>
								{storeName}
							</button>
						) : storeId ? (
							<Link
								key="store"
								href={`/s/${storeId}/reservation`}
								className="hover:underline text-primary"
							>
								{storeName}
							</Link>
						) : (
							storeName
						),
					);
				}
				if (facilityName) {
					parts.push(
						storeId && facilityId ? (
							<Link
								key="facility"
								href={`/s/${storeId}/reservation/${facilityId}`}
								className="hover:underline text-primary"
							>
								{facilityName}
							</Link>
						) : (
							facilityName
						),
					);
				}
				if (serviceStaffName) {
					parts.push(
						`${t("service_staff") || "Service Staff"}: ${serviceStaffName}`,
					);
				}
				if (parts.length === 0) return <span className="sm:text-sm">-</span>;
				return (
					<span className="sm:text-sm">
						{parts.reduce<React.ReactNode[]>(
							(acc, part, i) => (i === 0 ? [part] : [...acc, " - ", part]),
							[],
						)}
					</span>
				);
			},
			meta: { className: "hidden sm:table-cell" },
		},
		{
			id: "numOfGuest",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_num_of_guest")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				return (
					<span className="sm:text-sm">
						{t("rsvp_num_of_guest_val", {
							adult: rsvp.numOfAdult || 0,
							child: rsvp.numOfChild || 0,
						})}
					</span>
				);
			},
			meta: { className: "hidden sm:table-cell" },
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
				const isClickable = canEdit && onEditClick;
				return (
					<div className="flex items-center gap-1.5">
						<span
							onClick={(e) => {
								e.stopPropagation();
								if (isClickable) onEditClick(rsvp);
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
							<span className="font-medium">
								{getRsvpStatusLabel(t, status, showStoreAdminConfirmAction)}
							</span>
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
				const message = getRsvpConversationMessage(row.original);
				return (
					<span className="max-w-[200px] truncate sm:text-sm">
						{message || "-"}
					</span>
				);
			},
			meta: { className: "hidden sm:table-cell" },
		},
		{
			id: "confirmationStatus",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("rsvp_confirmation_status") || "Confirmation"}
				/>
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const storeConfirmation = rsvp.confirmedByStore
					? t("rsvp_confirmation_confirmed") || "Confirmed"
					: t("rsvp_confirmation_pending") || "Pending";
				const customerConfirmation = rsvp.confirmedByCustomer
					? t("rsvp_confirmation_confirmed") || "Confirmed"
					: t("rsvp_confirmation_pending") || "Pending";
				return (
					<div className="text-xs sm:text-sm leading-tight">
						<div>
							{t("rsvp_confirmation_store") || "Store"}: {storeConfirmation}
						</div>
						<div>
							{t("rsvp_confirmation_customer") || "Customer"}:{" "}
							{customerConfirmation}
						</div>
					</div>
				);
			},
			meta: { className: "hidden sm:table-cell min-w-[10rem]" },
		},
		{
			accessorKey: "alreadyPaid",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("rsvp_already_paid")} />
			),
			cell: ({ row }) => {
				const rsvp = row.original;
				const paid = row.getValue("alreadyPaid") as boolean;
				const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
				const serviceStaffCost = rsvp.serviceStaffCost
					? Number(rsvp.serviceStaffCost)
					: 0;
				const total = facilityCost + serviceStaffCost;
				const isPaid = paid || total <= 0;
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
				const createdAtEpoch = toBigIntEpochUnknown(createdAt);
				const utcDate = epochToDate(createdAtEpoch) ?? new Date();
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
			meta: { className: "hidden sm:table-cell" },
		},
	];

	const calendarColumn: ColumnDef<Rsvp> = {
		id: "calendarExport",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("rsvp_calendar_export_column")}
			/>
		),
		cell: ({ row }) => (
			<RsvpCalendarExportButtons
				rsvp={row.original}
				storeTimezone={storeTimezone}
				location={calendarLocation}
				googleLabel={t("rsvp_add_to_google_calendar")}
				icsLabel={t("rsvp_download_ics")}
			/>
		),
		meta: { className: "min-w-[7rem]" },
	};

	const actionsColumn: ColumnDef<Rsvp> = {
		id: "actions",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("actions")} />
		),
		cell: ({ row }) => {
			const rsvp = row.original;
			const canEdit = canEditReservation?.(rsvp) ?? false;
			const canCancel = canCancelReservation?.(rsvp) ?? false;
			const isConfirmAction =
				showStoreAdminConfirmAction &&
				rsvp.status === RsvpStatus.ReadyToConfirm;
			const isCustomerConfirmAction =
				!showStoreAdminConfirmAction &&
				rsvp.status === RsvpStatus.Ready &&
				!rsvp.confirmedByCustomer;
			const canShowEditAction = canEdit || isConfirmAction;
			return (
				<div className="flex items-center gap-1.5">
					{isCustomerConfirmAction && onCustomerConfirmClick && (
						<IconCheck
							className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity text-emerald-600"
							onClick={(e) => {
								e.stopPropagation();
								onCustomerConfirmClick(rsvp);
							}}
							title={t("rsvp_customer_confirm_title") || "Confirm reservation"}
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
					{canShowEditAction && onEditClick && (
						<>
							{isConfirmAction ? (
								<IconCheck
									className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity text-green-600"
									onClick={(e) => {
										e.stopPropagation();
										onEditClick(rsvp);
									}}
									title={t("rsvp_confirm_this_rsvp") || "Confirm reservation"}
								/>
							) : (
								<IconPencil
									className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity text-blue-500"
									onClick={(e) => {
										e.stopPropagation();
										onEditClick(rsvp);
									}}
									title={t("edit_reservation") || "Edit reservation"}
								/>
							)}
						</>
					)}
				</div>
			);
		},
	};

	if (hideActions) {
		return baseColumns;
	}
	const withCalendar = showCalendarExport
		? [...baseColumns, calendarColumn]
		: baseColumns;
	return [...withCalendar, actionsColumn];
};
