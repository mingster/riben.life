"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Badge } from "@/components/ui/badge";

import type { CreditBonusRuleColumn } from "../credit-bonus-rule-column";
import { CellAction } from "./cell-action";

interface CreateTableColumnsOptions {
	onDeleted?: (ruleId: string) => void;
	onUpdated?: (rule: CreditBonusRuleColumn) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<CreditBonusRuleColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "threshold",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("credit_bonus_rule_threshold")}
				/>
			),
			cell: ({ row }) => {
				const threshold = row.getValue("threshold") as number;
				return <span>{threshold.toFixed(2)}</span>;
			},
		},
		{
			accessorKey: "bonus",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("credit_bonus_rule_bonus")}
				/>
			),
			cell: ({ row }) => {
				const bonus = row.getValue("bonus") as number;
				return <span>{bonus.toFixed(2)}</span>;
			},
		},
		{
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("status")} />
			),
			cell: ({ row }) => {
				const isActive = row.getValue("isActive") as boolean;
				return (
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? t("active") : t("inactive")}
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
