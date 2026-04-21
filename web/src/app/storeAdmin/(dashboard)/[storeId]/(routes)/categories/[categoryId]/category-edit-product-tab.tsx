"use client";

import type { Product, ProductCategories } from "@prisma/client";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { t } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";
import { getProductStatusTranslationKey } from "@/types/enum";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

interface props {
	storeId: string;
	initialData?: ProductCategories[] | []; // persisted data from database
	allProducts: Product[]; //all available products in the store
}

// Select products for this store category.
//
export const CategoryEditProductTab = ({
	storeId,
	initialData,
	allProducts,
}: props) => {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(false);

	const [selectedProductIds, setSelectedProductIds] =
		useState<RowSelectionState>();

	if (!mounted) return <></>;

	const formattedProducts: ProductColumn[] = allProducts.map(
		(item: Product) => ({
			id: item.id.toString(),
			storeId: storeId,
			name: item.name.toString(),
			price: Number(item.price),
			status: item.status,
			isFeatured: item.isFeatured,
			//createdAt: item.createdAt,
			updatedAt: formatDateTime(
				typeof item.updatedAt === "bigint"
					? (epochToDate(item.updatedAt) ?? new Date())
					: typeof item.updatedAt === "number"
						? (epochToDate(BigInt(item.updatedAt)) ?? new Date())
						: new Date(),
			),
		}),
	);

	//console.log(`ProductEditCategoryTab: ${JSON.stringify(initialData)}`);
	/*
  const initiallySelected1: RowSelectionState = {
    "f376e45f-2374-4adf-bb01-3f3bb48259a2": false,
    "60688323-8aa0-45f8-98fb-2d4ff822bf4d": true,
    "e2a53c05-ad5c-46cc-926b-00982ce24a60": true,
  };
  */

	// construct pre-select rows from ProductCategories
	//
	const initiallySelected: RowSelectionState = {};
	if (initialData) {
		// use index number as row key
		initialData.map((pc: ProductCategories, _index2) => {
			allProducts.map((item: Product, index) => {
				//console.log(`checked: ${index} - ${item.id}-${pc.categoryId === item.id}`,);
				if (pc.productId === item.id) {
					initiallySelected[index] = true;
				}
			});
		});

		/* use id as key
    for (let i = 0; i < allCategories.length; i++) {
      for (let j = 0; j <= initialData.length; j++) {
        if (initialData[j].categoryId === allCategories[i].id) {
          initiallySelected[i] = true;
        }
        else {
          initiallySelected[i] = false;
        }
      }
    }


    for (let i = 0; i < initialData.length; i++) {
      initiallySelected[initialData[i].categoryId.toString()] = true;
    }
    */
	}
	//console.log("initiallySelected");
	//console.log(initiallySelected);

	// persist check/uncheck status to database
	//
	const saveData = async () => {
		const storeId = params.storeId?.toString() ?? "";
		const categoryId = params.categoryId?.toString() ?? "";
		const effectiveSelection = selectedProductIds ?? initiallySelected;
		const base = `/api/storeAdmin/${storeId}/categories/${categoryId}/product`;

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

			for (let index = 0; index < allProducts.length; index++) {
				if (!effectiveSelection[index]) {
					continue;
				}
				const item = allProducts[index];
				const postRes = await fetch(base, {
					method: "POST",
					credentials: "same-origin",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						productId: item.id,
						categoryId,
						sortOrder: index + 1,
					}),
				});
				if (!postRes.ok) {
					const text = await postRes.text();
					throw new Error(text || postRes.statusText);
				}
			}

			toastSuccess({
				title: t("category") + t("added"),
				description: "",
			});
			router.refresh();
			router.push(`/storeAdmin/${storeId}/categories`);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			{/* display */}
			<Card className="w-full">
				<CardContent className="space-y-2">
					<DataTableCheckbox
						disabled={loading}
						searchKey="name"
						columns={columns}
						data={formattedProducts}
						initiallySelected={initiallySelected}
						onRowSelectionChange={setSelectedProductIds}
					/>
					<Button
						type="button"
						disabled={loading}
						className="touch-manipulation disabled:opacity-25"
						onClick={() => void saveData()}
					>
						{t("add")}
					</Button>

					<Button
						type="button"
						variant="outline"
						disabled={loading}
						className="touch-manipulation"
						onClick={() => {
							router.push(
								`/storeAdmin/${params.storeId?.toString()}/categories`,
							);
						}}
					>
						{t("cancel")}
					</Button>
				</CardContent>
			</Card>
		</>
	);
};

type ProductColumn = {
	id: string; // CANNOT rename, because we hard code the name in DataTableCheckbox.
	storeId: string;
	name: string;
	price: number;
	isFeatured: boolean;
	status: number;
	//isRecurring: boolean | undefined;
	//stock: number | undefined;
	updatedAt: string;
};

const columns: ColumnDef<ProductColumn>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("product_name")} />
			);
		},
		cell: ({ row }) => (
			<Link
				className="pl-0"
				title="click to edit"
				href={`../products/${row.original.id}`}
			>
				{row.getValue("name")}
			</Link>
		),
	},
	{
		accessorKey: "price",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("product_price")} />
			);
		},
		cell: ({ row }) => {
			const price = Number(row.getValue("price"));

			return (
				<div className="">
					<Currency value={price} />
				</div>
			);
		},
	},
	{
		accessorKey: "isFeatured",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("product_featured")} />
			);
		},
		cell: ({ row }) => {
			const val =
				row.getValue("isFeatured") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "status",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("product_status")} />
			);
		},
		cell: ({ row }) => {
			const statusValue = Number(row.getValue("status"));
			const key = getProductStatusTranslationKey(statusValue);
			return (
				<div>
					{key === "product_status_unknown"
						? t("product_status_unknown", { status: String(statusValue) })
						: t(key)}
				</div>
			);
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title={t("updated")} />;
		},
	},
	/*
  {
    accessorKey: "id",
  },*/
];
