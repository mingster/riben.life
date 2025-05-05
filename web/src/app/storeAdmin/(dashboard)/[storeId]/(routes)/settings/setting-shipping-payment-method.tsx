"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useTranslation } from "@/app/i18n/client";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Checkbox } from "@/components/ui/checkbox";

import Currency from "@/components/currency";
import { useI18n } from "@/providers/i18n-provider";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import axios from "axios";
import { t } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import { RequiredProVersion } from "../components/require-pro-version";
import type { Store } from "./page";

export interface SettingsFormProps {
	sqlData: Store;
	allPaymentMethods: PaymentMethod[] | [];
	allShippingMethods: ShippingMethod[] | [];
	disablePaidOptions: boolean;
}

export const ShippingPaymentMethodTab: React.FC<SettingsFormProps> = ({
	sqlData,
	allPaymentMethods,
	allShippingMethods,
	disablePaidOptions,
}) => {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();

	const [loading, setLoading] = useState(false);

	const [selectedShippingIds, setSelectedShippingIds] =
		useState<RowSelectionState>();

	const [selectedPayMethodIds, setSelectedPayMethodIds] =
		useState<RowSelectionState>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	// persist check/uncheck status to database
	//
	const saveShippingData = async (
		_event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		setLoading(true);
		// selectedCategoryIds = RowSelectionState = Record<string, boolean>
		if (!selectedShippingIds) return;
		//console.log(selectedShippingIds);

		// remove all categories associated with the product
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/shippingMethods`;
		await axios.delete(url, { data: {} });

		allShippingMethods.map(async (item: ShippingMethod, index) => {
			const selected = selectedShippingIds[index];
			//console.log(`selected shippingMethod: ${item.id.toString()} : ${selected}`);
			if (selected) {
				// save to db
				const obj = {
					storeId: params.storeId as string,
					methodId: item.id.toString(),
				};
				await axios.post(url, obj);
				//console.log(`save to db: ${item.id.toString()}`);
			}
		});

		router.refresh();

		toast({
			title: t("Product_category") + t("Updated"),
			description: "",
			variant: "success",
		});

		setLoading(false);
	};

	const formattedShippings: ShippingMethodColumn[] = allShippingMethods.map(
		(item: ShippingMethod) => ({
			id: item.id.toString(),
			name: item.name.toString(),
			basic_price: Number(item.basic_price),
			currencyId: item.currencyId.toString(),
			isDefault: item.isDefault,
			shipRequried: item.shipRequried,
			disabled: disablePaidOptions,
		}),
	);

	// check the saved shipping methods
	//
	// biome-ignore lint/style/noVar: <explanation>
	const savedStoreShippingMethods: RowSelectionState = {};

	if (sqlData) {
		// use index number as row key
		sqlData.StoreShippingMethods.map((mapping) => {
			allShippingMethods.map((item: ShippingMethod, index) => {
				if (mapping.methodId === item.id) {
					savedStoreShippingMethods[index] = true;
				}
			});
		});
	}

	const formattedPaymethods: PayMethodColumn[] = allPaymentMethods.map(
		(item: PaymentMethod) => ({
			id: item.id.toString(),
			name: item.name.toString(),
			fee: Number(item.fee),
			priceDescr: item.priceDescr.toString(),
			isDefault: item.isDefault,
			disabled: disablePaidOptions,
		}),
	);
	// biome-ignore lint/style/noVar: <explanation>
	const savedStorePayMethods: RowSelectionState = {};
	if (sqlData) {
		// use index number as row key
		sqlData.StorePaymentMethods.map((mapping) => {
			allPaymentMethods.map((item: PaymentMethod, index) => {
				if (mapping.methodId === item.id) {
					savedStorePayMethods[index] = true;
				}
			});
		});
	}
	const savePaymethodData = async (
		_event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		setLoading(true);
		if (!selectedPayMethodIds) return;
		//console.log(selectedShippingIds);

		// remove all categories associated with the product
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/paymentMethods`;
		await axios.delete(url, { data: {} });

		allPaymentMethods.map(async (item: PaymentMethod, index) => {
			const selected = selectedPayMethodIds[index];
			//console.log(`selected shippingMethod: ${item.id.toString()} : ${selected}`);
			if (selected) {
				// save to db
				const obj = {
					storeId: params.storeId as string,
					methodId: item.id.toString(),
				};
				await axios.post(url, obj);
				//console.log(`save to db: ${item.id.toString()}`);
			}
		});

		router.refresh();

		toast({
			title: t("Product_category") + t("Updated"),
			description: "",
			variant: "success",
		});

		setLoading(false);
	};

	return (
		<>
			{disablePaidOptions && <RequiredProVersion />}
			<Card>
				<CardHeader>請勾選本店所支援的配送方式:</CardHeader>
				<CardContent
					className="space-y-2 data-[disabled]:text-gary-900 data-[disabled]:bg-gary-900"
					data-disabled={disablePaidOptions}
				>
					<DataTableCheckbox
						searchKey=""
						columns={shipColumns}
						data={formattedShippings}
						initiallySelected={savedStoreShippingMethods}
						onRowSelectionChange={setSelectedShippingIds}
						disabled={loading || disablePaidOptions}
					/>
					<Button
						type="button"
						disabled={loading || disablePaidOptions}
						className="disabled:opacity-25"
						onClick={saveShippingData}
					>
						{t("Save")}
					</Button>
				</CardContent>
			</Card>

			<div className="pt-2" />

			<Card>
				<CardHeader>請勾選本店所支援的付款方式:</CardHeader>
				<CardContent
					className="space-y-2 data-[disabled]:text-gary-900 data-[disabled]:bg-gary-900"
					data-disabled={disablePaidOptions}
				>
					<DataTableCheckbox
						searchKey=""
						columns={PayMethodColumns}
						data={formattedPaymethods}
						initiallySelected={savedStorePayMethods}
						disabled={loading || disablePaidOptions}
						onRowSelectionChange={setSelectedPayMethodIds}
					/>
					<Button
						type="button"
						disabled={loading || disablePaidOptions}
						className="disabled:opacity-25"
						onClick={savePaymethodData}
					>
						{t("Save")}
					</Button>
				</CardContent>
			</Card>
		</>
	);
};

type PayMethodColumn = {
	id: string;
	name: string;
	fee: number;
	priceDescr: string;
	isDefault: boolean;
	disabled: boolean;
};

const PayMethodColumns: ColumnDef<PayMethodColumn>[] = [
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
				disabled={row.original.disabled}
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
				<DataTableColumnHeader
					column={column}
					title={t("paymentMethod_name")}
				/>
			);
		},
	},
	{
		accessorKey: "priceDescr",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("paymentMethod_cost")}
				/>
			);
		},
	},
	{
		accessorKey: "isDefault",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("paymentMethod_isDefault")}
				/>
			);
		},
		cell: ({ row }) => {
			const isDefault =
				row.getValue("isDefault") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{isDefault}</div>;
		},
	},
	/*
  {
    accessorKey: "id",
  },*/
];

type ShippingMethodColumn = {
	id: string;
	name: string;
	basic_price: number;
	currencyId: string;
	isDefault: boolean;
	shipRequried: boolean;
	disabled: boolean;
	//createdAt: Date;
	//updatedAt: Date;
};

const shipColumns: ColumnDef<ShippingMethodColumn>[] = [
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
				disabled={row.original.disabled}
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
				<DataTableColumnHeader column={column} title={t("shippingMethod")} />
			);
		},
	},
	{
		accessorKey: "currencyId",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("shippingMethod_currency")}
				/>
			);
		},
	},
	{
		accessorKey: "basic_price",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("shippingMethod_price")}
				/>
			);
		},
		cell: ({ row }) => {
			const price = Number(row.getValue("basic_price"));

			return <Currency value={price} />;
		},
	},
	{
		accessorKey: "shipRequried",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("shippingMethod_shipRequired")}
				/>
			);
		},
		cell: ({ row }) => {
			const shipRequried =
				row.getValue("shipRequried") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{shipRequried}</div>;
		},
	},
	{
		accessorKey: "isDefault",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("shippingMethod_isDefault")}
				/>
			);
		},
		cell: ({ row }) => {
			const isDefault =
				row.getValue("isDefault") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{isDefault}</div>;
		},
	},
	/*
  {
    accessorKey: "id",
  },*/
];
