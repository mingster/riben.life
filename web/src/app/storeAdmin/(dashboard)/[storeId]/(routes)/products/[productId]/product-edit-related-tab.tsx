"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";

export type RelatedProductRow = {
	id: string;
	name: string;
};

interface ProductEditRelatedTabProps {
	storeId: string;
	productId: string;
	allProducts: RelatedProductRow[];
	initialRelatedIds: string[];
}

function relatedApiBase(storeId: string, productId: string): string {
	return `/api/storeAdmin/${storeId}/product/${productId}/related`;
}

export function ProductEditRelatedTab({
	storeId,
	productId,
	allProducts,
	initialRelatedIds,
}: ProductEditRelatedTabProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>();

	useEffect(() => {
		setMounted(true);
	}, []);

	const sortedProducts = useMemo(
		() => [...allProducts].sort((a, b) => a.name.localeCompare(b.name)),
		[allProducts],
	);

	const initiallySelected = useMemo(() => {
		const state: RowSelectionState = {};
		const related = new Set(initialRelatedIds);
		sortedProducts.forEach((p, index) => {
			if (related.has(p.id)) {
				state[index] = true;
			}
		});
		return state;
	}, [initialRelatedIds, sortedProducts]);

	const columns = useMemo<ColumnDef<RelatedProductRow>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label={t("select_all")}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={t("data_table_select_row_aria")}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("product_name")} />
				),
			},
		],
		[t],
	);

	const saveData = async () => {
		const effectiveSelection = selectedRows ?? initiallySelected;
		const base = relatedApiBase(storeId, productId);

		setLoading(true);
		try {
			const delRes = await fetch(base, {
				method: "DELETE",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			if (!delRes.ok) {
				throw new Error((await delRes.text()) || delRes.statusText);
			}

			for (let index = 0; index < sortedProducts.length; index++) {
				if (!effectiveSelection[index]) continue;
				const p = sortedProducts[index];
				const postRes = await fetch(base, {
					method: "POST",
					credentials: "same-origin",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ targetProductId: p.id, sortOrder: index }),
				});
				if (!postRes.ok) {
					throw new Error((await postRes.text()) || postRes.statusText);
				}
			}

			toastSuccess({ title: t("product_updated"), description: "" });
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	if (!mounted) return null;

	return (
		<Card className="w-full">
			<CardContent className="space-y-0 pt-0">
				<DataTableCheckbox
					disabled={loading}
					searchKey="name"
					columns={columns}
					data={sortedProducts}
					initiallySelected={initiallySelected}
					onRowSelectionChange={setSelectedRows}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						disabled={loading}
						className="touch-manipulation disabled:opacity-25"
						onClick={() => void saveData()}
					>
						{t("product_related_save_assignments")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
