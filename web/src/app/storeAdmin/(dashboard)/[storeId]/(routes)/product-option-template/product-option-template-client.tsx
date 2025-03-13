"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

import type { StoreProductOptionTemplate } from "@/types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { AlertModal } from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import { StoreProductOptionSelectionsTemplate } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CheckIcon, Trash, XIcon } from "lucide-react";
import { AddProductOptionTemplateDialog } from "./product-option-template-dialog";

interface editProps {
	data: StoreProductOptionTemplate[] | [];
}
export const ProductsOptionTemplateClient = ({ data }: editProps) => {
	//console.log("storeOptionTemplates", JSON.stringify(storeOptionTemplates));

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	// map product to ui
	const formattedProductOption: ProductOptionTemplateColumn[] = data.map(
		(item: StoreProductOptionTemplate) => ({
			id: item.id,
			optionName: item.optionName.toString(),
			isRequired: item.isRequired,
			isMultiple: item.isMultiple,
			minSelection: item.minSelection,
			maxSelection: item.maxSelection,
			allowQuantity: item.allowQuantity,
			minQuantity: item.minQuantity,
			maxQuantity: item.maxQuantity,
			storeProductOptionTemplate: item,
		}),
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("ProductOption_template_Mgmt")}
					badge={data.length}
					description=""
				/>
				<div>
					<AddProductOptionTemplateDialog initialData={null} action="Create" />
				</div>
			</div>

			<Card>
				<CardContent className="w-full space-y-1">
					<DataTable
						noSearch={true}
						columns={columns}
						data={formattedProductOption}
					/>
				</CardContent>
			</Card>
		</>
	);
};

export type ProductOptionTemplateColumn = {
	id: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	allowQuantity: boolean;
	minQuantity: number;
	maxQuantity: number;
	storeProductOptionTemplate: StoreProductOptionTemplate;
};

const columns: ColumnDef<ProductOptionTemplateColumn>[] = [
	{
		accessorKey: "optionName",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_optionName")}
				/>
			);
		},
	},
	{
		accessorKey: "isRequired",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_isRequired")}
				/>
			);
		},
		cell: ({ row }) => {
			const val =
				row.getValue("isRequired") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "isMultiple",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_isMultiple")}
				/>
			);
		},
		cell: ({ row }) => {
			const val =
				row.getValue("isMultiple") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "minSelection",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_minSelection")}
				/>
			);
		},
	},
	{
		accessorKey: "maxSelection",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_maxSelection")}
				/>
			);
		},
	},
	{
		accessorKey: "allowQuantity",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("ProductOption_allowQuantity")}
				/>
			);
		},
		cell: ({ row }) => {
			const val =
				row.getValue("allowQuantity") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{val}</div>;
		},
	},
	{
		accessorKey: "storeProductOptionTemplate",
		header: ({ column }) => {
			return <div className="pl-3">{t("ProductOption_selections")}</div>;
		},
		cell: ({ row }) => {
			const val = row.getValue(
				"storeProductOptionTemplate",
			) as StoreProductOptionTemplate;

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

interface CellActionProps {
	data: ProductOptionTemplateColumn;
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
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product-option-template/${data.id}`,
		);

		toast({
			title: `${t("ProductOption_template")} ${t("Deleted")}`,
			description: "",
			variant: "success",
		});
		router.refresh();
		setLoading(false);
		setOpen(false);
		/*} catch (error: unknown) {
      const err = error as AxiosError;
      toast({
        title: "something wrong.",
        description: err.message,
        variant: "destructive",
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
			<AddProductOptionTemplateDialog
				initialData={data.storeProductOptionTemplate}
				action="Edit"
			/>
			<Button
				variant="outline"
				className="text-white bg-red-600 dark:bg-red-900"
				onClick={() => setOpen(true)}
			>
				<Trash className="mr-0 size-4" /> {t("Delete")}
			</Button>
		</>
	);
};
