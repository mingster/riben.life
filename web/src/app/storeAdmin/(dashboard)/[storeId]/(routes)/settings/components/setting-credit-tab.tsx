"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { updateStoreCreditAction } from "@/actions/storeAdmin/rsvpSettings/update-store-credit";
import {
	type UpdateStoreCreditInput,
	updateStoreCreditSchema,
} from "@/actions/storeAdmin/rsvpSettings/update-store-credit.validation";
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
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";

import type { SettingsFormProps } from "./settings-types";

export const SettingCreditTab: React.FC<
	Pick<SettingsFormProps, "store" | "onStoreUpdated">
> = ({ store, onStoreUpdated }) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const defaultValues: UpdateStoreCreditInput = {
		useCustomerCredit: store.useCustomerCredit ?? false,
		creditExchangeRate: Number(store.creditExchangeRate ?? 0),
		creditServiceExchangeRate: Number(store.creditServiceExchangeRate ?? 0),
		creditMaxPurchase: Number(store.creditMaxPurchase ?? 0),
		creditMinPurchase: Number(store.creditMinPurchase ?? 0),
		creditExpiration: store.creditExpiration ?? 365,
	};

	const form = useForm<UpdateStoreCreditInput>({
		resolver: zodResolver(
			updateStoreCreditSchema,
		) as Resolver<UpdateStoreCreditInput>,
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: UpdateStoreCreditInput) {
		setLoading(true);
		try {
			const result = await updateStoreCreditAction(
				String(params.storeId),
				data,
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store) {
				onStoreUpdated?.(result.data.store as Store);
				form.reset({
					useCustomerCredit: result.data.store.useCustomerCredit ?? false,
					creditExchangeRate: Number(result.data.store.creditExchangeRate ?? 0),
					creditServiceExchangeRate: Number(
						result.data.store.creditServiceExchangeRate ?? 0,
					),
					creditMaxPurchase: Number(result.data.store.creditMaxPurchase ?? 0),
					creditMinPurchase: Number(result.data.store.creditMinPurchase ?? 0),
					creditExpiration: result.data.store.creditExpiration ?? 365,
				});
			}
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
							name="useCustomerCredit"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<FormLabel>
											{t("store_settings_use_customer_credit")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("store_settings_use_customer_credit_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="creditExchangeRate"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_credit_exchange_rate")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.0001"
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_credit_exchange_rate_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="creditServiceExchangeRate"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_credit_service_exchange_rate")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.0001"
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_credit_service_exchange_rate_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="creditMaxPurchase"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_credit_max_purchase")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="1"
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_credit_max_purchase_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="creditMinPurchase"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_credit_min_purchase")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="1"
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_credit_min_purchase_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="creditExpiration"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_credit_expiration")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="1"
											min={0}
											disabled={loading}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_credit_expiration_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{Object.keys(form.formState.errors).length > 0 && (
							<div className="space-y-1.5 rounded-md border border-destructive/50 bg-destructive/15 p-3">
								<div className="text-destructive text-sm font-semibold">
									{t("please_fix_validation_errors")}
								</div>
								{Object.entries(form.formState.errors).map(([field, err]) => (
									<div
										key={field}
										className="text-destructive flex gap-2 text-sm"
									>
										<span className="font-medium">{field}:</span>
										<span>{err.message as string}</span>
									</div>
								))}
							</div>
						)}

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
