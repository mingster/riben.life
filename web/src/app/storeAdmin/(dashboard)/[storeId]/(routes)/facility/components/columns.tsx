"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import Link from "next/link";
import { useQRCode } from "next-qrcode";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { TableColumn } from "../table-column";
import { CellAction } from "./cell-action";

interface QrCodeProps {
	data: TableColumn;
}

export const QRCode: React.FC<QrCodeProps> = ({ data }) => {
	const { SVG } = useQRCode();

	return (
		<Link
			href={`/${data.storeId}/${data.id}`}
			target="_blank"
			title="click to preview the table store page."
		>
			<SVG
				text={`/${data.storeId}/${data.id}`}
				options={{
					margin: 2,
					width: 100,
				}}
			/>
		</Link>
	);
};

interface CreateTableColumnsOptions {
	onDeleted?: (tableId: string) => void;
	onUpdated?: (table: TableColumn) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<TableColumn>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "facilityName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Facility_Name")} />
			),
			cell: ({ row }) => <span>{row.getValue("facilityName") as string}</span>,
		},
		{
			accessorKey: "capacity",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("Facility_Seats")} />
			),
			cell: ({ row }) => <span>{row.getValue("capacity") as number}</span>,
		},
		{
			accessorKey: "defaultCost",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Facility_Default_Cost")}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("defaultCost") as number}</span>,
		},
		{
			accessorKey: "defaultCredit",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Facility_Default_Credit")}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("defaultCredit") as number}</span>,
		},
		{
			accessorKey: "defaultDuration",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("Facility_Default_Duration")}
				/>
			),
			cell: ({ row }) => (
				<span>{row.getValue("defaultDuration") as number}</span>
			),
		},
		{
			id: "qrcode",
			header: () => "",
			cell: ({ row }) => <QRCode data={row.original} />,
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
