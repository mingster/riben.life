"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";

import type { FacilityPricingRuleColumn } from "../facility-pricing-rule-column";
import { CellAction } from "./cell-action";

interface CreateTableColumnsOptions {
	onDeleted?: (ruleId: string) => void;
	onUpdated?: (rule: FacilityPricingRuleColumn) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<FacilityPricingRuleColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("pricing_rule_name")} />
			),
			cell: ({ row }) => <span>{row.getValue("name") as string}</span>,
		},
		{
			accessorKey: "facilityName",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_facility_name")}
				/>
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
			accessorKey: "priority",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_priority")}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("priority") as number}</span>,
		},
		{
			accessorKey: "dayOfWeek",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_day_of_week")}
				/>
			),
			cell: ({ row }) => {
				const dayOfWeek = row.getValue("dayOfWeek") as string | null;
				if (!dayOfWeek) return <span>{t("All_Days")}</span>;
				if (dayOfWeek === "weekend") return <span>{t("Weekend")}</span>;
				if (dayOfWeek === "weekday") return <span>{t("Weekday")}</span>;
				try {
					const days = JSON.parse(dayOfWeek) as number[];
					const dayNames = [
						t("Sunday"),
						t("Monday"),
						t("Tuesday"),
						t("Wednesday"),
						t("Thursday"),
						t("Friday"),
						t("Saturday"),
					];
					return <span>{days.map((d) => dayNames[d]).join(", ")}</span>;
				} catch {
					return <span>{dayOfWeek}</span>;
				}
			},
		},
		{
			accessorKey: "startTime",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_time_range")}
				/>
			),
			cell: ({ row }) => {
				const startTime = row.getValue("startTime") as string | null;
				const endTime = row.original.endTime;
				if (!startTime && !endTime) return <span>{t("All_Times")}</span>;
				return (
					<span>
						{startTime || "00:00"} - {endTime || "23:59"}
					</span>
				);
			},
		},
		{
			accessorKey: "cost",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("pricing_rule_cost")} />
			),
			cell: ({ row }) => {
				const cost = row.getValue("cost") as number | null;
				return <span>{cost !== null ? cost.toFixed(2) : "-"}</span>;
			},
		},
		{
			accessorKey: "credit",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_credit")}
				/>
			),
			cell: ({ row }) => {
				const credit = row.getValue("credit") as number | null;
				return <span>{credit !== null ? credit.toFixed(2) : "-"}</span>;
			},
		},
		{
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("pricing_rule_status")}
				/>
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
