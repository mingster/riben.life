"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { useTranslation } from "@/app/i18n/client";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Checkbox } from "@/components/ui/checkbox";

import Currency from "@/components/currency";
import { useI18n } from "@/providers/i18n-provider";
import { Store } from "@/types";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { t } from "i18next";
import { RequiredProVersion } from "../components/require-pro-version";
import { updateStoreShippingMethodsAction } from "@/actions/storeAdmin/settings/update-store-shipping-methods";
import { updateStorePaymentMethodsAction } from "@/actions/storeAdmin/settings/update-store-payment-methods";
export interface ShippingPaymentSettingsFormProps {
	store: Store;
	allPaymentMethods: PaymentMethod[] | [];
	allShippingMethods: ShippingMethod[] | [];
	disablePaidOptions: boolean;
	onStoreUpdated?: (store: Store) => void;
}

export const ShippingPaymentMethodTab: React.FC<
	ShippingPaymentSettingsFormProps
> = ({
	store,
	allPaymentMethods,
	allShippingMethods,
	disablePaidOptions,
	onStoreUpdated,
}) => {
	type StoreShipMapping = NonNullable<Store["StoreShippingMethods"]>[number];
	type StorePayMapping = NonNullable<Store["StorePaymentMethods"]>[number];

	const params = useParams();

	const [loading, setLoading] = useState(false);

	const [selectedShippingIds, setSelectedShippingIds] =
		useState<RowSelectionState>();

	const [selectedPayMethodIds, setSelectedPayMethodIds] =
		useState<RowSelectionState>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// persist check/uncheck status to database
	//
	const saveShippingData = async (
		_event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		setLoading(true);
		const selectionState = selectedShippingIds ?? savedStoreShippingMethods;
		const selectedIndexes = Object.entries(selectionState)
			.filter(([, value]) => value)
			.map(([key]) => Number(key));

		const methodIds = selectedIndexes
			.map((index) => allShippingMethods[index]?.id?.toString())
			.filter((id): id is string => Boolean(id));

		const result = await updateStoreShippingMethodsAction(
			params.storeId as string,
			{ methodIds },
		);

		if (result?.serverError) {
			toastError({ title: t("error_title"), description: result.serverError });
		} else if (result?.data) {
			onStoreUpdated?.(result.data.store as Store);
			const nextSelection: RowSelectionState = {};
			selectedIndexes.forEach((index) => {
				nextSelection[index] = true;
			});
			setSelectedShippingIds(nextSelection);

			toastSuccess({
				title: t("Product_category") + t("updated"),
				description: "",
			});
		}

		setLoading(false);
	};

	const formattedShippings: ShippingMethodColumn[] = useMemo(
		() =>
			allShippingMethods.map((item: ShippingMethod) => ({
				id: item.id.toString(),
				name: item.name.toString(),
				basic_price: Number(item.basic_price),
				currencyId: item.currencyId.toString(),
				isDefault: item.isDefault,
				shipRequired: item.shipRequired,
				disabled: disablePaidOptions,
			})),
		[allShippingMethods, disablePaidOptions],
	);

	// check the saved shipping methods
	const savedStoreShippingMethods: RowSelectionState = {};

	// use index number as row key
	store.StoreShippingMethods?.forEach((mapping: StoreShipMapping) => {
		allShippingMethods.forEach((item: ShippingMethod, index) => {
			if (mapping.methodId === item.id) {
				savedStoreShippingMethods[index] = true;
			}
		});
	});

	const formattedPaymethods: PayMethodColumn[] = useMemo(
		() =>
			allPaymentMethods.map((item: PaymentMethod) => ({
				id: item.id.toString(),
				name: item.name.toString(),
				fee: Number(item.fee),
				priceDescr: item.priceDescr.toString(),
				isDefault: item.isDefault,
				disabled: disablePaidOptions,
			})),
		[allPaymentMethods, disablePaidOptions],
	);
	const savedStorePayMethods: RowSelectionState = {};
	// use index number as row key
	store.StorePaymentMethods?.forEach((mapping: StorePayMapping) => {
		allPaymentMethods.forEach((item: PaymentMethod, index) => {
			if (mapping.methodId === item.id) {
				savedStorePayMethods[index] = true;
			}
		});
	});
	const savePaymethodData = async (
		_event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		setLoading(true);

		const selectionState = selectedPayMethodIds ?? savedStorePayMethods;
		const selectedIndexes = Object.entries(selectionState)
			.filter(([, value]) => value)
			.map(([key]) => Number(key));

		const methodIds = selectedIndexes
			.map((index) => allPaymentMethods[index]?.id?.toString())
			.filter((id): id is string => Boolean(id));

		const result = await updateStorePaymentMethodsAction(
			params.storeId as string,
			{ methodIds },
		);

		if (result?.serverError) {
			toastError({ title: t("error_title"), description: result.serverError });
		} else if (result?.data) {
			onStoreUpdated?.(result.data.store as Store);
			const nextSelection: RowSelectionState = {};
			selectedIndexes.forEach((index) => {
				nextSelection[index] = true;
			});
			setSelectedPayMethodIds(nextSelection);

			toastSuccess({
				title: t("Product_category") + t("updated"),
				description: "",
			});
		}

		setLoading(false);
	};

	return (
		<>
			{disablePaidOptions && <RequiredProVersion />}
			<Card>
				<CardHeader>請勾選本店所支援的配送方式:</CardHeader>
				<CardContent
					className="space-y-2 data-disabled:text-gary-900 data-disabled:bg-gary-900"
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
						{t("save")}
					</Button>
				</CardContent>
			</Card>

			<div className="pt-2" />

			<Card>
				<CardHeader>請勾選本店所支援的付款方式:</CardHeader>
				<CardContent
					className="space-y-2 data-disabled:text-gary-900 data-disabled:bg-gary-900"
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
						{t("save")}
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
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
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
	shipRequired: boolean;
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
		accessorKey: "shipRequired",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader
					column={column}
					title={t("shippingMethod_shipRequired")}
				/>
			);
		},
		cell: ({ row }) => {
			const shipRequired =
				row.getValue("shipRequired") === true ? (
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{shipRequired}</div>;
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
					<IconCheck className="text-green-400  size-4" />
				) : (
					<IconX className="text-red-400 size-4" />
				);

			return <div className="pl-3">{isDefault}</div>;
		},
	},
	/*
  {
	accessorKey: "id",
  },*/
];
