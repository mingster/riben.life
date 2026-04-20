"use client";

import { IconCheck, IconX } from "@tabler/icons-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";

import type {
	AdminCategoryRow,
	ProductCategoryAssignmentRow,
} from "./product-edit-types";

interface ProductEditCategoryTabProps {
	storeId: string;
	productId: string;
	categories: AdminCategoryRow[];
	initialAssignments: ProductCategoryAssignmentRow[];
}

/** Same-origin store-admin API (riben.life pattern; avoids NEXT_PUBLIC_API_URL / CORS). */
function productCategoryApiBase(storeId: string, productId: string): string {
	return `/api/storeAdmin/${storeId}/product/${productId}/category`;
}

export function ProductEditCategoryTab({
	storeId,
	productId,
	categories,
	initialAssignments,
}: ProductEditCategoryTabProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>();

	useEffect(() => {
		setMounted(true);
	}, []);

	const sortedCategories = useMemo(
		() =>
			[...categories].sort((a, b) => {
				if (a.sortOrder !== b.sortOrder) {
					return a.sortOrder - b.sortOrder;
				}
				return a.name.localeCompare(b.name);
			}),
		[categories],
	);

	const initiallySelected = useMemo(() => {
		const state: RowSelectionState = {};
		const assigned = new Set(initialAssignments.map((a) => a.categoryId));
		sortedCategories.forEach((cat, index) => {
			if (assigned.has(cat.id)) {
				state[index] = true;
			}
		});
		return state;
	}, [initialAssignments, sortedCategories]);

	const columns = useMemo<ColumnDef<AdminCategoryRow>[]>(
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
					<DataTableColumnHeader column={column} title={t("category_name")} />
				),
				cell: ({ row }) => (
					<Link
						className="text-primary hover:underline"
						href={`/storeAdmin/${storeId}/categories/${row.original.id}`}
						title={t("edit")}
					>
						{row.getValue("name")}
					</Link>
				),
			},
			{
				accessorKey: "sortOrder",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("sort_order")} />
				),
			},
			{
				accessorKey: "isFeatured",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("product_featured")}
					/>
				),
				cell: ({ row }) =>
					row.getValue("isFeatured") === true ? (
						<IconCheck className="size-4 text-green-500" />
					) : (
						<IconX className="size-4 text-red-400" />
					),
			},
		],
		[t, storeId],
	);

	const saveData = async () => {
		const effectiveSelection = selectedRows ?? initiallySelected;
		const base = productCategoryApiBase(storeId, productId);

		setLoading(true);
		try {
			const delRes = await fetch(base, {
				method: "DELETE",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			if (!delRes.ok) {
				const text = await delRes.text();
				throw new Error(text || delRes.statusText);
			}

			for (let index = 0; index < sortedCategories.length; index++) {
				if (!effectiveSelection[index]) {
					continue;
				}
				const cat = sortedCategories[index];
				const postRes = await fetch(base, {
					method: "POST",
					credentials: "same-origin",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						productId,
						categoryId: cat.id,
						sortOrder: index + 1,
					}),
				});
				if (!postRes.ok) {
					const text = await postRes.text();
					throw new Error(text || postRes.statusText);
				}
			}

			toastSuccess({
				title: t("product_updated"),
				description: "",
			});
			router.refresh();
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	if (!mounted) {
		return null;
	}

	return (
		<Card className="w-full">
			<CardContent className="space-y-0 pt-0">
				<DataTableCheckbox
					disabled={loading}
					searchKey="name"
					columns={columns}
					data={sortedCategories}
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
						{t("product_category_save_assignments")}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={loading}
						className="touch-manipulation"
						onClick={() => {
							router.push(`/storeAdmin/${storeId}/products`);
						}}
					>
						{t("cancel")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
