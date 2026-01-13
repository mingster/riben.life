"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import type { ProductOptionTemplateColumn } from "../product-option-template-column";
import { CellAction } from "./cell-action";

interface CreateColumnsOptions {
	onUpdated?: (template: ProductOptionTemplateColumn) => void;
	onDeleted?: (id: string) => void;
}

export const createProductOptionTemplateColumns = (
	t: TFunction,
	options: CreateColumnsOptions = {},
): ColumnDef<ProductOptionTemplateColumn>[] => {
	const { onUpdated, onDeleted } = options;

	return [
		{
			accessorKey: "optionName",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_option_name")}
				/>
			),
		},
		{
			accessorKey: "isRequired",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_is_required")}
				/>
			),
			cell: ({ row }) => {
				const isRequired = row.getValue("isRequired") === true;

				return (
					<div className="pl-3">
						{isRequired ? (
							<CheckIcon className="size-4 text-green-500" />
						) : (
							<XIcon className="size-4 text-red-500" />
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "isMultiple",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_is_multiple")}
				/>
			),
			cell: ({ row }) => {
				const isMultiple = row.getValue("isMultiple") === true;

				return (
					<div className="pl-3">
						{isMultiple ? (
							<CheckIcon className="size-4 text-green-500" />
						) : (
							<XIcon className="size-4 text-red-500" />
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "minSelection",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_min_selection")}
				/>
			),
		},
		{
			accessorKey: "maxSelection",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_max_selection")}
				/>
			),
		},
		{
			accessorKey: "allowQuantity",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("product_option_allow_quantity")}
				/>
			),
			cell: ({ row }) => {
				const allowQuantity = row.getValue("allowQuantity") === true;

				return (
					<div className="pl-3">
						{allowQuantity ? (
							<CheckIcon className="size-4 text-green-500" />
						) : (
							<XIcon className="size-4 text-red-500" />
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "selections",
			header: () => (
				<div className="pl-3">{t("product_option_selections")}</div>
			),
			cell: ({ row }) => (
				<div>
					{row.original.selections.map((selection) => (
						<div key={selection.id} className="pl-0 text-nowrap">
							{selection.name}
							{selection.price !== 0 && ` :(${selection.price})`}
							{selection.isDefault && ` :(${t("default")})`}
						</div>
					))}
				</div>
			),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<CellAction
					data={row.original}
					onUpdated={onUpdated}
					onDeleted={onDeleted}
				/>
			),
		},
	];
};
