"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { TFunction } from "i18next";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";

import type { CreditBonusRuleColumn } from "../credit-bonus-rule-column";
import { CellAction } from "./cell-action";

interface CreateCreditBonusRuleColumnsOptions {
	onUpdated?: (rule: CreditBonusRuleColumn) => void;
	onDeleted?: (id: string) => void;
}

export function createCreditBonusRuleColumns(
	t: TFunction,
	options: CreateCreditBonusRuleColumnsOptions = {},
): ColumnDef<CreditBonusRuleColumn>[] {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "threshold",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("credit_bonus_rule_threshold")}
				/>
			),
		},
		{
			accessorKey: "bonus",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("credit_bonus_rule_bonus")}
				/>
			),
		},
		{
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("status")} />
			),
			cell: ({ row }) => (
				<Badge variant={row.original.isActive ? "default" : "secondary"}>
					{row.original.isActive ? t("active") : t("inactive")}
				</Badge>
			),
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("updated")} />
			),
			cell: ({ row }) => format(row.original.updatedAt, "yyyy-MM-dd HH:mm"),
		},
		{
			id: "actions",
			header: () => t("actions"),
			cell: ({ row }) => (
				<CellAction
					data={row.original}
					onUpdated={onUpdated}
					onDeleted={onDeleted}
				/>
			),
		},
	];
}
