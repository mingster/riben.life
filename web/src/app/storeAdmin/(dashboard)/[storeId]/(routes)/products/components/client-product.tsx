"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { getProductStatusTranslationKey, ProductStatus } from "@/types/enum";

import type { ProductColumn } from "../product-column";
import { BulkAddProductsDialog } from "./bulk-add-products-dialog";
import { CellAction } from "./cell-action";
import { EditProduct } from "./edit-product";

interface ClientProductProps {
	serverData: ProductColumn[];
	/** Prefer server-provided store id so product links always match the current route segment. */
	storeId: string;
}

function productStatusBadgeVariant(
	status: number,
): ComponentProps<typeof Badge>["variant"] {
	if (status === ProductStatus.Published) {
		return "default";
	}
	if (status === ProductStatus.Draft) {
		return "secondary";
	}
	if (status === ProductStatus.Archived) {
		return "outline";
	}
	if (status === ProductStatus.Deleted) {
		return "destructive";
	}
	return "outline";
}

export function ClientProduct({ serverData, storeId }: ClientProductProps) {
	const [data, setData] = useState<ProductColumn[]>(serverData);
	const params = useParams<{ storeId: string }>();
	const storeIdForLinks = storeId || String(params.storeId ?? "");
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleUpdated = useCallback((row: ProductColumn) => {
		setData((prev) =>
			prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)),
		);
	}, []);

	const handleCreated = useCallback((row: ProductColumn) => {
		setData((prev) => [row, ...prev]);
	}, []);

	const handleDeleted = useCallback((row: ProductColumn) => {
		setData((prev) => prev.filter((p) => p.id !== row.id));
	}, []);

	const handleBulkCreated = useCallback((rows: ProductColumn[]) => {
		if (!rows?.length) {
			return;
		}
		setData((prev) => {
			const existingIds = new Set(prev.map((p) => p.id));
			const filtered = rows.filter((p) => !existingIds.has(p.id));
			if (!filtered.length) {
				return prev;
			}
			return [...filtered, ...prev];
		});
	}, []);

	const columns: ColumnDef<ProductColumn>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("product_name")} />
				),
				cell: ({ row }) => (
					<Button variant="link" className="h-auto p-0 text-left" asChild>
						<Link
							href={`/storeAdmin/${storeIdForLinks}/products/${row.original.id}`}
						>
							{row.original.name}
						</Link>
					</Button>
				),
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("product_price")} />
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("product_status")} />
				),
				cell: ({ row }) => {
					const status = row.original.status;
					const key = getProductStatusTranslationKey(status);
					const label =
						key === "product_status_unknown"
							? t("product_status_unknown", { status: String(status) })
							: t(key);
					return (
						<Badge
							variant={productStatusBadgeVariant(status)}
							className="touch-manipulation font-normal"
						>
							{label}
						</Badge>
					);
				},
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("updated_at")} />
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<EditProduct
							product={row.original}
							onUpdated={handleUpdated}
							trigger={
								<Button
									variant="outline"
									size="sm"
									className="touch-manipulation"
								>
									{t("edit")}
								</Button>
							}
						/>
						<CellAction item={row.original} onDeleted={handleDeleted} />
					</div>
				),
			},
		],
		[storeIdForLinks, t, handleUpdated, handleDeleted],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("product_mgmt")}
					badge={data.length}
					description={t("product_mgmt_descr")}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<BulkAddProductsDialog onCreatedMany={handleBulkCreated} />
					<EditProduct isNew onCreated={handleCreated} />
				</div>
			</div>
			<Separator className="my-4" />
			<DataTable
				columns={columns}
				data={data}
				searchKey="name"
				noSearch={false}
			/>
		</>
	);
}
