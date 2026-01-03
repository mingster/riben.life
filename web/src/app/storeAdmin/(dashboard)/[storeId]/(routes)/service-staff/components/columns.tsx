"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { ServiceStaffColumn } from "../service-staff-column";
import { CellAction } from "./cell-action";
import { EditServiceStaffDialog } from "./edit-service-staff-dialog";

interface CreateTableColumnsOptions {
	onDeleted?: (id: string) => void;
	onUpdated?: (serviceStaff: ServiceStaffColumn) => void;
	onEdit?: (serviceStaff: ServiceStaffColumn) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<ServiceStaffColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "userName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("name") || "Name"} />
			),
			cell: ({ row }) => {
				const userName = row.getValue("userName") as string | null;
				const userEmail = row.original.userEmail;
				return (
					<div className="flex items-center gap-2" title="click to edit">
						<EditServiceStaffDialog
							serviceStaff={row.original}
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
				<DataTableColumnHeader column={column} title={t("email") || "Email"} />
			),
			cell: ({ row }) => {
				const email = (row.getValue("userEmail") as string | null) || "-";
				const phone = row.original.userPhoneNumber || "-";
				const emailDisplay = email !== "-" ? email.substring(0, 20) : email;
				return (
					<div className="flex flex-col">
						<span>{emailDisplay}</span>
						<span className="text-sm text-muted-foreground">{phone}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "memberRole",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Role") || "Role"} />
			),
			cell: ({ row }) => (
				<span>{(row.getValue("memberRole") as string) || "-"}</span>
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "capacity",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("service_staff_capacity") || "Capacity"}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("capacity") as number}</span>,
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "defaultCost",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={`${t("service_staff_default_cost") || "Default Cost"} / ${t("service_staff_default_credit") || "Default Credit"}`}
				/>
			),
			cell: ({ row }) => {
				const cost = (row.getValue("defaultCost") as number) ?? 0;
				const credit = row.original.defaultCredit ?? 0;
				return (
					<div className="flex flex-row gap-1">
						<span>{cost.toFixed(2)}</span>
						<span className="text-sm text-muted-foreground">/</span>
						<span className="text-sm text-muted-foreground">
							{credit.toFixed(2)}
						</span>
					</div>
				);
			},
		},

		{
			accessorKey: "defaultDuration",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("service_staff_default_duration") || "Default Duration"}
				/>
			),
			cell: ({ row }) => (
				<span>{row.getValue("defaultDuration") as number}</span>
			),
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
				/>
			),
		},
	];
};
