"use client";

import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { updateStorePaymentMethodsAction } from "@/actions/storeAdmin/settings/update-store-payment-methods";
import { updateStoreShippingMethodsAction } from "@/actions/storeAdmin/settings/update-store-shipping-methods";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import Currency from "@/components/currency";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";

import { RequiredProVersion } from "../../components/require-pro-version";
import type { SettingsFormProps } from "./settings-types";

type PaymentRow = {
	id: string;
	name: string;
	fee: number;
	clearDays: number;
};

type ShippingRow = {
	id: string;
	name: string;
	basic_price: number;
	currencyId: string;
	shipRequired: boolean;
};

export const SettingShippingPaymentMethodTab: React.FC<
	Pick<
		SettingsFormProps,
		| "store"
		| "paymentMethods"
		| "shippingMethods"
		| "disablePaidOptions"
		| "onStoreUpdated"
	>
> = ({
	store,
	paymentMethods,
	shippingMethods,
	disablePaidOptions,
	onStoreUpdated,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);
	const [paymentSelection, setPaymentSelection] = useState<RowSelectionState>(
		{},
	);
	const [shippingSelection, setShippingSelection] = useState<RowSelectionState>(
		{},
	);

	const paymentRows: PaymentRow[] = useMemo(
		() =>
			paymentMethods.map((pm: PaymentMethod) => ({
				id: pm.id,
				name: pm.name,
				fee: Number(pm.fee),
				clearDays: pm.clearDays,
			})),
		[paymentMethods],
	);

	const shippingRows: ShippingRow[] = useMemo(
		() =>
			shippingMethods.map((sm: ShippingMethod) => ({
				id: sm.id,
				name: sm.name,
				basic_price: Number(sm.basic_price),
				currencyId: sm.currencyId,
				shipRequired: sm.shipRequired,
			})),
		[shippingMethods],
	);

	const mappedPaymentIds = useMemo(
		() =>
			new Set(
				store.StorePaymentMethods?.map(
					(m: { methodId: string }) => m.methodId,
				).filter(Boolean) ?? [],
			),
		[store.StorePaymentMethods],
	);

	const mappedShippingIds = useMemo(
		() =>
			new Set(
				store.StoreShippingMethods?.map(
					(m: { methodId: string }) => m.methodId,
				).filter(Boolean) ?? [],
			),
		[store.StoreShippingMethods],
	);

	const initialPaymentSelection = useMemo(() => {
		const sel: RowSelectionState = {};
		paymentMethods.forEach((pm, index) => {
			if (mappedPaymentIds.has(pm.id)) {
				sel[String(index)] = true;
			}
		});
		return sel;
	}, [paymentMethods, mappedPaymentIds]);

	const initialShippingSelection = useMemo(() => {
		const sel: RowSelectionState = {};
		shippingMethods.forEach((sm, index) => {
			if (mappedShippingIds.has(sm.id)) {
				sel[String(index)] = true;
			}
		});
		return sel;
	}, [shippingMethods, mappedShippingIds]);

	const paymentTableKey = useMemo(
		() => [...mappedPaymentIds].sort().join(","),
		[mappedPaymentIds],
	);

	const shippingTableKey = useMemo(
		() => [...mappedShippingIds].sort().join(","),
		[mappedShippingIds],
	);

	const paymentColumns = useMemo<ColumnDef<PaymentRow>[]>(
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
						aria-label="Select all"
						disabled={disablePaidOptions || loading}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
						disabled={disablePaidOptions || loading}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("name")} />
				),
			},
			{
				accessorKey: "fee",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("fee")} />
				),
				cell: ({ row }) => {
					const fee = row.getValue("fee") as number;
					return <span>{(fee * 100).toFixed(2)}%</span>;
				},
			},
			{
				accessorKey: "clearDays",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("store_settings_payment_clear_days")}
					/>
				),
			},
		],
		[t, disablePaidOptions, loading],
	);

	const shippingColumns = useMemo<ColumnDef<ShippingRow>[]>(
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
						aria-label="Select all"
						disabled={disablePaidOptions || loading}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
						disabled={disablePaidOptions || loading}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("name")} />
				),
			},
			{
				accessorKey: "basic_price",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("cost")} />
				),
				cell: ({ row }) => {
					const price = row.getValue("basic_price") as number;
					const currency = row.original.currencyId;
					return (
						<Currency
							value={price}
							currency={currency}
							lng={lng}
							colored={false}
						/>
					);
				},
			},
			{
				accessorKey: "shipRequired",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("shipping_method_ship_required")}
					/>
				),
				cell: ({ row }) => (row.getValue("shipRequired") ? t("yes") : t("no")),
			},
		],
		[t, disablePaidOptions, loading, lng],
	);

	const savePayment = useCallback(async () => {
		const methodIds = paymentMethods
			.filter((_pm, index) => paymentSelection[String(index)])
			.map((pm) => pm.id);
		setLoading(true);
		try {
			const result = await updateStorePaymentMethodsAction(
				String(params.storeId),
				{ methodIds },
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store) {
				onStoreUpdated?.(result.data.store as Store);
			}
		} finally {
			setLoading(false);
		}
	}, [paymentMethods, paymentSelection, params.storeId, onStoreUpdated, t]);

	const saveShipping = useCallback(async () => {
		const methodIds = shippingMethods
			.filter((_sm, index) => shippingSelection[String(index)])
			.map((sm) => sm.id);
		setLoading(true);
		try {
			const result = await updateStoreShippingMethodsAction(
				String(params.storeId),
				{ methodIds },
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store) {
				onStoreUpdated?.(result.data.store as Store);
			}
		} finally {
			setLoading(false);
		}
	}, [shippingMethods, shippingSelection, params.storeId, onStoreUpdated, t]);

	return (
		<div
			className="relative flex min-h-[200px] flex-col gap-4"
			aria-busy={loading}
		>
			{loading && (
				<div
					className="absolute inset-0 z-100 flex cursor-wait items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					role="status"
				>
					<div className="flex flex-col items-center gap-3">
						<Loader />
						<span className="text-muted-foreground text-sm font-medium">
							{t("saving")}
						</span>
					</div>
				</div>
			)}
			{disablePaidOptions && (
				<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
					<RequiredProVersion />
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{t("store_settings_tab_payment_method")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<DataTableCheckbox
						key={paymentTableKey}
						columns={paymentColumns}
						data={paymentRows}
						searchKey="name"
						pageSize={200}
						initiallySelected={initialPaymentSelection}
						disabled={disablePaidOptions || loading}
						onRowSelectionChange={setPaymentSelection}
					/>
					<AdminSettingsTabFormFooter>
						<Button
							type="button"
							disabled={disablePaidOptions || loading}
							className="touch-manipulation"
							onClick={() => void savePayment()}
						>
							{t("save")}
						</Button>
					</AdminSettingsTabFormFooter>
				</CardContent>
			</Card>

			<Separator />

			<Card>
				<CardHeader>
					<CardTitle>{t("store_settings_tab_shipping_method")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<DataTableCheckbox
						key={shippingTableKey}
						columns={shippingColumns}
						data={shippingRows}
						searchKey="name"
						pageSize={200}
						initiallySelected={initialShippingSelection}
						disabled={disablePaidOptions || loading}
						onRowSelectionChange={setShippingSelection}
					/>
					<AdminSettingsTabFormFooter>
						<Button
							type="button"
							disabled={disablePaidOptions || loading}
							className="touch-manipulation"
							onClick={() => void saveShipping()}
						>
							{t("save")}
						</Button>
					</AdminSettingsTabFormFooter>
				</CardContent>
			</Card>
		</div>
	);
};
