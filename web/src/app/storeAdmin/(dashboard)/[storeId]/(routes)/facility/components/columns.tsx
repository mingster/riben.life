"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import Link from "next/link";
import { useQRCode } from "next-qrcode";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { TableColumn } from "../table-column";
import { CellAction } from "./cell-action";
import { EditFacilityDialog } from "./edit-facility-dialog";
import type { StoreFacility } from "@/types";

interface QrCodeProps {
	data: StoreFacility;
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
	onDeleted?: (facilityId: string) => void;
	onUpdated?: (facility: StoreFacility) => void;
	onEdit?: (facility: StoreFacility) => void;
}

export const createTableColumns = (
	t: TFunction,
	options: CreateTableColumnsOptions = {},
): ColumnDef<StoreFacility>[] => {
	const { onDeleted, onUpdated } = options;

	return [
		{
			accessorKey: "facilityName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("facility_name")} />
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-2" title="click to edit">
					<EditFacilityDialog
						facility={row.original}
						onUpdated={onUpdated}
						trigger={
							<button
								type="button"
								className="text-left hover:underline cursor-pointer font-medium"
							>
								{row.getValue("facilityName") as string}
							</button>
						}
					/>
				</div>
			),
		},
		{
			accessorKey: "capacity",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("facility_seats")} />
			),
			cell: ({ row }) => <span>{row.getValue("capacity") as number}</span>,
		},
		{
			accessorKey: "defaultCost",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("facility_default_cost")}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("defaultCost") as number}</span>,
		},
		{
			accessorKey: "defaultCredit",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("facility_default_credit")}
				/>
			),
			cell: ({ row }) => <span>{row.getValue("defaultCredit") as number}</span>,
		},
		{
			accessorKey: "defaultDuration",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("facility_default_duration")}
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
