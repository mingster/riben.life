"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import type { BalanceColumn } from "../balance-column";

export const createBalanceColumns = (
	t: TFunction,
): ColumnDef<BalanceColumn>[] => {
	const dateFormat = t("datetime_format");

	return [
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("created_at")} />
			),
		},
		{
			accessorKey: "availability",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("availability_date")} />
			),
			cell: ({ row }) => {
				const balance = row.original;
				if (!balance.availabilityIso) return "-";
				const date = new Date(balance.availabilityIso);
				if (isNaN(date.getTime())) return balance.availability;
				return <span>{format(date, dateFormat)}</span>;
			},
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
				<DataTableColumnHeader column={column} title={t("platform_fee")} />
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
};
