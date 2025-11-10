"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import type {
	Product,
	ProductOption,
	StoreProductOptionTemplate,
} from "@/types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { AlertModal } from "@/components/modals/alert-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";
import type {
	ProductOptionSelections,
	StoreProductOptionSelectionsTemplate,
} from "@prisma/client";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { AddProductOptionDialog } from "./product-option-dialog";
import { toastSuccess } from "@/components/toaster";

interface editProps {
	initialData:
		| (Product & {
				//images: ProductImage[];
				//productPrices: ProductPrice[];
				//ProductImages: ProductImages[] | null;
				//ProductAttribute: ProductAttribute | null;
		  })
		| null;
	storeOptionTemplates: StoreProductOptionTemplate[] | [];

	action: string;
}
export const ProductEditOptionsTab = ({
	initialData,
	storeOptionTemplates,
	action,
}: editProps) => {
	const productOptions = initialData?.ProductOptions;

	//console.log("storeOptionTemplates", JSON.stringify(storeOptionTemplates));
	/* */
	return (
		<>
			<Card>
				<CardContent className="w-full space-y-1">
					<div className="text-right pt-1">
						<AddProductOptionDialog initialData={null} action="Create" />
					</div>
					<DisplayOptions productOptions={productOptions ?? []} />

					<Separator />

					<h2>從商店範本加入</h2>
					<DisplayStoreOptionTemplates
						storeOptionTemplates={storeOptionTemplates ?? []}
						excludes={productOptions ?? []}
					/>
				</CardContent>
			</Card>
		</>
	);
};

export const DisplayStoreOptionTemplates = ({
	storeOptionTemplates,
	excludes,
}: {
	storeOptionTemplates: StoreProductOptionTemplate[];
	excludes: ProductOption[];
}) => {
	const params = useParams();
	const router = useRouter();

	const [selectedIdx, setSelectedIdx] = useState<RowSelectionState>();
	const initiallySelected: RowSelectionState = {};
	const [loading, setLoading] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	if (!storeOptionTemplates) return <></>;

	const storeOptionColumns = useMemo(() => createStoreOptionColumns(t), [t]);

	// exclude options already in the product
	const storeOptionTemplatesToInclude = storeOptionTemplates.filter(
		(template) =>
			!excludes.some((exclude) =>
				template.optionName.includes(exclude.optionName),
			),
	);

	/*
	let storeOptionTemplatesToInclude1 = storeOptionTemplates;
  if (excludes.length > 0) {
	for (let i = 0; i < storeOptionTemplates.length; i++) {
	  if (
		!excludes.some((exclude) =>
		  storeOptionTemplates[i].optionName.includes(exclude.optionName),
		)
	  )
		storeOptionTemplatesToInclude.push(storeOptionTemplates[i]);
	}
  }
  */

	// map product to ui
	const formattedProductOption: ProductOptionColumn[] =
		storeOptionTemplatesToInclude.map((item: StoreProductOptionTemplate) => ({
			id: item.id,
			optionName: item.optionName.toString(),
			isRequired: item.isRequired,
			isMultiple: item.isMultiple,
			minSelection: item.minSelection,
			maxSelection: item.maxSelection,
			allowQuantity: item.allowQuantity,
			minQuantity: item.minQuantity,
			maxQuantity: item.maxQuantity,
			sortOrder: item.sortOrder,
			productOption: item,
		}));

	const saveData = async () => {
		if (!selectedIdx) return;

		setLoading(true);
		storeOptionTemplatesToInclude.map(
			async (item: StoreProductOptionTemplate, index) => {
				//const selected = selectedCategoryIds[item.id.toString()];
				const selected = selectedIdx[index];

				if (selected) {
					// copy the option template to product
					//console.log("item", index, item.id, item.optionName);

					await axios.post(
						`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${item.storeId}/product/${params.productId}/options/copy-option-template/${item.id}`,
						{},
					);
				}
			},
		);

		toastSuccess({
			title: t("ProductOption") + t("Added"),
			description: "",
		});

		setLoading(false);
		router.refresh();

		window.location.assign(
			`/storeAdmin/${params.storeId}/products/${params.productId}?tab=options`,
		);
	};

	return (
		<>
			<DataTableCheckbox
				disabled={loading}
				noSearch={true}
				columns={storeOptionColumns}
				data={formattedProductOption}
				initiallySelected={initiallySelected}
				onRowSelectionChange={setSelectedIdx}
			/>
			<Button
				type="button"
				disabled={loading}
				className="disabled:opacity-25"
				onClick={saveData}
			>
				{t("Add")}
			</Button>
		</>
	);
};

export type ProductOptionColumn = {
	id: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	allowQuantity: boolean;
	minQuantity: number;
	maxQuantity: number;
	sortOrder: number;
	productOption: ProductOption | StoreProductOptionTemplate;
};

interface CellActionProps {
	data: ProductOptionColumn;
}

const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const onConfirm = async () => {
		//try {
		setLoading(true);

		await axios.delete(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/options/${data.id}`,
		);

		toastSuccess({
			title: `${t("ProductOption")} ${t("Deleted")}`,
			description: "",
		});
		router.refresh();
		setLoading(false);
		setOpen(false);
		/*} catch (error: unknown) {
	  const err = error as AxiosError;
	  toastError({
		title: "something wrong.",
		description: err.message,
	  });
	} finally {
	  setLoading(false);
	  setOpen(false);
	}*/
	};

	//console.log('cellaction:',JSON.stringify(data.productOption));
	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onConfirm}
				loading={loading}
			/>
			<AddProductOptionDialog initialData={data.productOption} action="Edit" />
			<Button
				variant="outline"
				className="text-white bg-red-600 dark:bg-red-900"
				onClick={() => setOpen(true)}
			>
				<IconTrash className="mr-0 size-4" /> {t("Delete")}
			</Button>
		</>
	);
};

export const DisplayOptions = ({
	productOptions,
}: {
	productOptions: ProductOption[];
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	if (!productOptions) return <></>;

	/*
  productOptions.map((option: ProductOption, index) => {
	logger.info("${index}");
  });
  */

	// map product to ui
	const formattedProductOption: ProductOptionColumn[] = productOptions.map(
		(item: ProductOption) => ({
			id: item.id,
			optionName: item.optionName.toString(),
			isRequired: item.isRequired,
			isMultiple: item.isMultiple,
			minSelection: item.minSelection,
			maxSelection: item.maxSelection,
			allowQuantity: item.allowQuantity,
			minQuantity: item.minQuantity,
			maxQuantity: item.maxQuantity,
			sortOrder: item.sortOrder,
			productOption: item,
		}),
	);

	const productColumns = useMemo(() => createProductOptionColumns(t), [t]);

	return (
		<>
			<DataTable
				noSearch={true}
				columns={productColumns}
				data={formattedProductOption}
			/>
		</>
	);
};

const createStoreOptionColumns = (
	t: TFunction,
): ColumnDef<ProductOptionColumn>[] => [
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
		accessorKey: "optionName",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_optionName")}
			/>
		),
	},
	{
		accessorKey: "isRequired",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_isRequired")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("isRequired") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "isMultiple",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_isMultiple")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("isMultiple") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "minSelection",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_minSelection")}
			/>
		),
	},
	{
		accessorKey: "maxSelection",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_maxSelection")}
			/>
		),
	},
	{
		accessorKey: "allowQuantity",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_allowQuantity")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("allowQuantity") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "productOption",
		header: () => <div className="pl-3">{t("ProductOption_selections")}</div>,
		cell: ({ row }) => {
			const val = row.getValue("productOption") as
				| ProductOption
				| StoreProductOptionTemplate;

			if ("ProductOptionSelections" in val) {
				return (
					<div>
						{val.ProductOptionSelections.map(
							(item: ProductOptionSelections) => (
								<div key={item.id} className="pl-0 text-nowrap">
									{`${item.name}`}{" "}
									{Number(item.price) !== 0 && `:(${item.price})`}
									{item.isDefault === true && `:(${t("Default")})`}
								</div>
							),
						)}
					</div>
				);
			}
			if ("StoreProductOptionSelectionsTemplate" in val) {
				return (
					<div>
						{val.StoreProductOptionSelectionsTemplate.map(
							(item: StoreProductOptionSelectionsTemplate) => (
								<div key={item.id} className="pl-0 text-nowrap">
									{`${item.name}`}{" "}
									{Number(item.price) !== 0 && `:(${item.price})`}
									{item.isDefault === true && `:(${t("Default")})`}
								</div>
							),
						)}
					</div>
				);
			}
		},
	},
];

const createProductOptionColumns = (
	t: TFunction,
): ColumnDef<ProductOptionColumn>[] => [
	{
		accessorKey: "optionName",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_optionName")}
			/>
		),
	},
	{
		accessorKey: "isRequired",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_isRequired")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("isRequired") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "isMultiple",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_isMultiple")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("isMultiple") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "allowQuantity",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_allowQuantity")}
			/>
		),
		cell: ({ row }) => {
			const val =
				row.getValue("allowQuantity") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "sortOrder",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title={t("ProductOption_sortOrder")}
			/>
		),
	},
	{
		accessorKey: "productOption",
		header: () => <div className="pl-3">{t("ProductOption_selections")}</div>,
		cell: ({ row }) => {
			const val = row.getValue("productOption") as
				| ProductOption
				| StoreProductOptionTemplate;

			if ("ProductOptionSelections" in val) {
				return (
					<div>
						{val.ProductOptionSelections.map(
							(item: ProductOptionSelections) => (
								<div key={item.id} className="pl-0 text-nowrap">
									{`${item.name}`}{" "}
									{Number(item.price) !== 0 && `:(${item.price})`}
									{item.isDefault === true && `:(${t("Default")})`}
								</div>
							),
						)}
					</div>
				);
			}
			if ("StoreProductOptionSelectionsTemplate" in val) {
				return (
					<div>
						{val.StoreProductOptionSelectionsTemplate.map(
							(item: StoreProductOptionSelectionsTemplate) => (
								<div key={item.id} className="pl-0 text-nowrap">
									{`${item.name}`}{" "}
									{Number(item.price) !== 0 && `:(${item.price})`}
									{item.isDefault === true && `:(${t("Default")})`}
								</div>
							),
						)}
					</div>
				);
			}
		},
	},
	{
		id: "actions",
		cell: ({ row }) => (
			<div className="text-right">
				<CellAction data={row.original} />
			</div>
		),
	},
];
