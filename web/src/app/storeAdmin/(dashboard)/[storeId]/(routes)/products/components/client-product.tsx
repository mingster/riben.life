"use client";

import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import Currency from "@/components/currency";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatuses } from "@/types/enum";
import type { ProductColumn } from "../product-column";
import { BulkCreateProductsDialog } from "./bulk-create-products-dialog";
import { CellAction } from "./cell-action";
import { EditProduct } from "./edit-product";

interface ProductsClientProps {
	serverData: ProductColumn[];
}

export const ProductsClient: React.FC<ProductsClientProps> = ({
	serverData,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [data, setData] = useState<ProductColumn[]>(serverData);

	useEffect(() => {
		setData(serverData);
	}, [serverData]);

	const handleCreated = useCallback((newProduct: ProductColumn) => {
		if (!newProduct) return;
		setData((prev) => [...prev, newProduct]);
	}, []);

	const handleBulkCreated = useCallback((newProducts: ProductColumn[]) => {
		if (!newProducts?.length) return;
		setData((prev) => [...prev, ...newProducts]);
	}, []);

	const handleDeleted = useCallback((productId: string) => {
		setData((prev) => prev.filter((item) => item.id !== productId));
	}, []);

	const tableColumns = useMemo<ColumnDef<ProductColumn>[]>(() => {
		return [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_name")} />
				),
				cell: ({ row }) => (
					<Link
						className="pl-0"
						title="click to edit"
						href={`./products/${row.original.id}`}
					>
						{row.getValue("name")}
					</Link>
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_status")} />
				),
				cell: ({ row }) => {
					const status = ProductStatuses[Number(row.getValue("status"))];

					return <div>{t(`ProductStatus_${status.label}`)}</div>;
				},
			},
			{
				accessorKey: "hasOptions",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("Product_hasOptions")}
					/>
				),
				cell: ({ row }) => {
					const val =
						row.getValue("hasOptions") === true ? (
							<CheckIcon className="text-green-400  size-4" />
						) : (
							<XIcon className="text-red-400 size-4" />
						);

					return <div className="pl-3">{val}</div>;
				},
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_price")} />
				),
				cell: ({ row }) => {
					const price = Number(row.getValue("price"));

					return <Currency value={price} />;
				},
			},
			{
				accessorKey: "stock",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_stock")} />
				),
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("updated")} />
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellAction data={row.original} onDeleted={handleDeleted} />
				),
			},
		];
	}, [handleDeleted, t]);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("Product_mgmt")}
					badge={data.length}
					description={t("Product_mgmt_descr")}
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<EditProduct
						isNew
						onCreated={handleCreated}
						trigger={
							<Button
								variant="outline"
								className="h-10 min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
							>
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
					<BulkCreateProductsDialog
						onCreated={handleBulkCreated}
						trigger={
							<Button
								variant="outline"
								className="h-10 min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
							>
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">
									{t("Product_mgmt_add_button")}
								</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable searchKey="name" columns={tableColumns} data={data} />
		</>
	);
};
