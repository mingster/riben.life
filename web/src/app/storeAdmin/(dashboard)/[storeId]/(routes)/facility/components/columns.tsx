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
		},
		{
			id: "qrcode",
			header: () => "",
			cell: ({ row }) => <QRCode data={row.original} />,
		},
		{
			id: "actions",
			header: () => t("actions"),
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
