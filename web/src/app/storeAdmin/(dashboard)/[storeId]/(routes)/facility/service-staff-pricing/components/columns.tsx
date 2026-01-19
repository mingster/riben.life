"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { FacilityServiceStaffPricingRuleColumn } from "../facility-service-staff-pricing-rule-column";
import { CellAction } from "./cell-action";
import { EditFacilityServiceStaffPricingRuleDialog } from "./edit-facility-service-staff-pricing-rule-dialog";

interface CreateTableColumnsOptions {
	onDeleted?: (ruleId: string) => void;
	onUpdated?: (rule: FacilityServiceStaffPricingRuleColumn) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<FacilityServiceStaffPricingRuleColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "facilityName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("facility")} />
			),
			cell: ({ row }) => {
				const facilityName = row.getValue("facilityName") as string | null;
				return (
					<span className="text-muted-foreground">
						{facilityName || t("All_Facilities")}
					</span>
				);
			},
		},
		{
			accessorKey: "serviceStaffName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("service_staff")} />
			),
			cell: ({ row }) => {
				const serviceStaffName = row.getValue("serviceStaffName") as
					| string
					| null;
				return (
					<span className="text-muted-foreground">
						{serviceStaffName || t("All_Service_Staff")}
					</span>
				);
			},
		},
		{
			accessorKey: "priority",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("priority")} />
			),
			cell: ({ row }) => <span>{row.getValue("priority") as number}</span>,
		},
		{
			accessorKey: "facilityDiscount",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("facility_discount")} />
			),
			cell: ({ row }) => {
				const discount = row.getValue("facilityDiscount") as number;
				return <span>{discount.toFixed(2)}</span>;
			},
		},
		{
			accessorKey: "serviceStaffDiscount",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("service_staff_discount")}
				/>
			),
			cell: ({ row }) => {
				const discount = row.getValue("serviceStaffDiscount") as number;
				return <span>{discount.toFixed(2)}</span>;
			},
		},
		{
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("active")} />
			),
			cell: ({ row }) => {
				const isActive = row.getValue("isActive") as boolean;
				return (
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? t("Active") : t("Inactive")}
					</Badge>
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
				/>
			),
		},
	];
};
