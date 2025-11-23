"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { BalanceColumn } from "../balance-column";

export const createBalanceColumns = (
	t: TFunction,
): ColumnDef<BalanceColumn>[] => [
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("createdAt")} />
		),
	},
	{
		accessorKey: "availability",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("availabilityDate")} />
		),
	},
	{
		accessorKey: "description",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("description")} />
		),
	},
	{
		accessorKey: "amount",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("amount")} />
		),
		cell: ({ row }) => {
			const amount = Number(row.getValue("amount"));
			return <Currency value={amount} />;
		},
	},
	{
		accessorKey: "fee",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("fee")} />
		),
		cell: ({ row }) => {
			const fee = Number(row.getValue("fee"));
			return <Currency value={fee} />;
		},
	},
	{
		accessorKey: "platformFee",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("platformFee")} />
		),
		cell: ({ row }) => {
			const platformFee = Number(row.getValue("platformFee"));
			return <Currency value={platformFee} />;
		},
	},
	{
		accessorKey: "balance",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("balance")} />
		),
		cell: ({ row }) => {
			const balance = Number(row.getValue("balance"));
			return <Currency value={balance} />;
		},
	},
	{
		accessorKey: "note",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={t("note")} />
		),
	},
];
