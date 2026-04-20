"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreSettings } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { updateStoreAdminSettingsAction } from "@/actions/storeAdmin/settings/update-store-admin-settings";
import {
	type UpdateStoreAdminSettingsInput,
	updateStoreAdminSettingsSchema,
} from "@/actions/storeAdmin/settings/update-store-admin-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";

interface SettingStorefrontShippingTabProps {
	store: Store;
	storeSettings: StoreSettings | null;
	onStoreUpdated?: (store: Store) => void;
	onStoreSettingsUpdated?: (settings: StoreSettings | null) => void;
}

export const SettingStorefrontShippingTab: React.FC<
	SettingStorefrontShippingTabProps
> = ({ store, storeSettings, onStoreUpdated, onStoreSettingsUpdated }) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const defaultValues: UpdateStoreAdminSettingsInput = {
		storeName: store.name ?? "",
		storefrontFreeShippingMinimum:
			storeSettings?.storefrontFreeShippingMinimum != null
				? Number(storeSettings.storefrontFreeShippingMinimum)
				: null,
		storefrontShippingEtaCopy: storeSettings?.storefrontShippingEtaCopy ?? "",
		storefrontPickupLocationsJson:
			storeSettings?.storefrontPickupLocationsJson ?? "[]",
	};

	const form = useForm<UpdateStoreAdminSettingsInput>({
		resolver: zodResolver(
			updateStoreAdminSettingsSchema,
		) as Resolver<UpdateStoreAdminSettingsInput>,
		defaultValues,
		mode: "onChange",
	});

	useEffect(() => {
		form.reset({
			storeName: store.name ?? "",
			storefrontFreeShippingMinimum:
				storeSettings?.storefrontFreeShippingMinimum != null
					? Number(storeSettings.storefrontFreeShippingMinimum)
					: null,
			storefrontShippingEtaCopy: storeSettings?.storefrontShippingEtaCopy ?? "",
			storefrontPickupLocationsJson:
				storeSettings?.storefrontPickupLocationsJson ?? "[]",
		});
	}, [store.name, storeSettings, form]);

	async function onSubmit(data: UpdateStoreAdminSettingsInput) {
		setLoading(true);
		try {
			const result = await updateStoreAdminSettingsAction(
				String(params.storeId),
				{ ...data, storeName: store.name },
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store?.name) {
				onStoreUpdated?.(result.data.store as Store);
			}
			if (result?.data?.storeSettings) {
				onStoreSettingsUpdated?.(result.data.storeSettings as StoreSettings);
			}
			form.reset({
				...data,
				storeName: (result?.data?.store?.name as string) ?? store.name,
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card>
			<CardContent className="relative pt-6" aria-busy={loading}>
				{loading && (
					<div
						className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
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
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex w-full flex-col gap-4 space-y-0"
					>
						<FormField
							control={form.control}
							name="storefrontFreeShippingMinimum"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("storefront_free_shipping_minimum")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step="0.01"
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											value={
												field.value === null || field.value === undefined
													? ""
													: field.value
											}
											onChange={(e) => {
												const v = e.target.value;
												field.onChange(v === "" ? null : Number.parseFloat(v));
											}}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("storefront_free_shipping_minimum_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="storefrontShippingEtaCopy"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("storefront_shipping_eta_copy")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading}
											className={
												fieldState.error
													? "min-h-[80px] border-destructive focus-visible:ring-destructive"
													: "min-h-[80px]"
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("storefront_shipping_eta_copy_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="storefrontPickupLocationsJson"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("storefront_pickup_locations_json")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading}
											className={`min-h-[120px] font-mono ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("storefront_pickup_locations_json_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<AdminSettingsTabFormFooter>
							<Button
								type="submit"
								disabled={loading || !form.formState.isValid}
								className="touch-manipulation disabled:opacity-25"
							>
								{t("save")}
							</Button>
						</AdminSettingsTabFormFooter>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
