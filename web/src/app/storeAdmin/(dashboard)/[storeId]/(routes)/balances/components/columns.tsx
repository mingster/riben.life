"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import type { BalanceColumn } from "../balance-column";
import { epochToDate } from "@/utils/datetime-utils";

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
			cell: ({ row }) => {
				const balance = row.original;
				if (!balance.createdAtIso) return "-";
				const date = new Date(balance.createdAtIso);
				if (isNaN(date.getTime())) return balance.createdAt;
				return <span>{format(date, dateFormat)}</span>;
			},
		},

		{
			accessorKey: "description",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("description")} />
			),
			meta: {
				className: "hidden sm:table-cell",
			},
		},
		{
			accessorKey: "amount",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("amount")} />
			),
			cell: ({ row }) => {
				const amount = Number(row.getValue("amount"));
				return (
					<span className="text-right">
						<Currency value={amount} />
					</span>
				);
			},
		},
		{
			accessorKey: "fee",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("fee")} />
			),
			cell: ({ row }) => {
				const fee = Number(row.getValue("fee"));
				return (
					<span className="text-right">
						<Currency value={fee} />
					</span>
				);
			},
		},
		{
			accessorKey: "platformFee",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("platform_fee")} />
			),
			cell: ({ row }) => {
				const platformFee = Number(row.getValue("platformFee"));
				return (
					<span className="text-right">
						<Currency value={platformFee} />
					</span>
				);
			},
		},
		{
			accessorKey: "balance",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("balance")} />
			),
			cell: ({ row }) => {
				const balance = Number(row.getValue("balance"));
				return (
					<span className="text-right">
						<Currency value={balance} />
					</span>
				);
			},
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
			meta: {
				className: "hidden sm:table-cell",
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
