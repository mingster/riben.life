"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { updateStorePaidOptionsAction } from "@/actions/storeAdmin/settings/update-store-paid-options";
import {
	type UpdateStorePaidOptionsInput,
	updateStorePaidOptionsSchema,
} from "@/actions/storeAdmin/settings/update-store-paid-options.validation";
import { parsePaymentCredentials } from "@/lib/payment/payment-credentials";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { Loader } from "@/components/loader";
import { TimezoneSelect } from "@/components/timezone-select";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";

import { RequiredProVersion } from "../../components/require-pro-version";
import type { SettingsFormProps } from "./settings-types";

export const SettingPaidOptionsTab: React.FC<
	Pick<SettingsFormProps, "store" | "disablePaidOptions" | "onStoreUpdated">
> = ({ store, disablePaidOptions, onStoreUpdated }) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const storeCreds = parsePaymentCredentials(store.paymentCredentials);
	const defaultValues: UpdateStorePaidOptionsInput = {
		customDomain: store.customDomain ?? "",
		LINE_PAY_ID: storeCreds.linepay?.id ?? "",
		LINE_PAY_SECRET: storeCreds.linepay?.secret ?? "",
		STRIPE_SECRET_KEY: storeCreds.stripe?.secretKey ?? "",
		PAYPAL_CLIENT_ID: storeCreds.paypal?.clientId ?? "",
		PAYPAL_CLIENT_SECRET: storeCreds.paypal?.clientSecret ?? "",
		logo: store.logo ?? "",
		logoPublicId: store.logoPublicId ?? "",
		acceptAnonymousOrder: store.acceptAnonymousOrder ?? true,
		defaultTimezone: store.defaultTimezone ?? "Asia/Taipei",
	};

	const form = useForm<UpdateStorePaidOptionsInput>({
		resolver: zodResolver(
			updateStorePaidOptionsSchema,
		) as Resolver<UpdateStorePaidOptionsInput>,
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: UpdateStorePaidOptionsInput) {
		setLoading(true);
		try {
			const result = await updateStorePaidOptionsAction(
				String(params.storeId),
				data,
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store) {
				const s = result.data.store as Store;
				onStoreUpdated?.(s);
				const sCreds = parsePaymentCredentials(s.paymentCredentials);
				form.reset({
					customDomain: s.customDomain ?? "",
					LINE_PAY_ID: sCreds.linepay?.id ?? "",
					LINE_PAY_SECRET: sCreds.linepay?.secret ?? "",
					STRIPE_SECRET_KEY: sCreds.stripe?.secretKey ?? "",
					PAYPAL_CLIENT_ID: sCreds.paypal?.clientId ?? "",
					PAYPAL_CLIENT_SECRET: sCreds.paypal?.clientSecret ?? "",
					logo: s.logo ?? "",
					logoPublicId: s.logoPublicId ?? "",
					acceptAnonymousOrder: s.acceptAnonymousOrder ?? true,
					defaultTimezone: s.defaultTimezone ?? "Asia/Taipei",
				});
			}
		} finally {
			setLoading(false);
		}
	}

	const locked = disablePaidOptions || loading;

	return (
		<Card>
			<CardContent className="relative space-y-6 pt-6" aria-busy={loading}>
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
				{disablePaidOptions && (
					<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
						<RequiredProVersion />
					</div>
				)}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex w-full flex-col gap-4 space-y-0"
					>
						<FormField
							control={form.control}
							name="acceptAnonymousOrder"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<FormLabel>
											{t("store_settings_accept_anonymous_order")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("store_settings_accept_anonymous_order_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={Boolean(field.value)}
											onCheckedChange={field.onChange}
											disabled={locked}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="defaultTimezone"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("default_timezone")}</FormLabel>
									<FormControl>
										<TimezoneSelect
											value={field.value ?? "Asia/Taipei"}
											onValueChange={field.onChange}
											disabled={locked}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="customDomain"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("custom_domain")}</FormLabel>
									<FormControl>
										<Input
											disabled={locked}
											className={
												fieldState.error
													? "h-10 border-destructive focus-visible:ring-destructive"
													: "h-10"
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<div>
							<h3 className="text-sm font-semibold">
								{t("store_settings_stripe_heading")}
							</h3>
							<p className="text-muted-foreground text-xs">
								{t("store_settings_stripe_intro")}
							</p>
						</div>
						<FormField
							control={form.control}
							name="STRIPE_SECRET_KEY"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_stripe_secret")}</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_stripe_secret_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<div>
							<h3 className="text-sm font-semibold">
								{t("store_settings_linepay_heading")}
							</h3>
							<p className="text-muted-foreground text-xs">
								{t("store_settings_linepay_intro")}
							</p>
						</div>
						<FormField
							control={form.control}
							name="LINE_PAY_ID"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_linepay_channel_id")}
									</FormLabel>
									<FormControl>
										<Input
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="LINE_PAY_SECRET"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_linepay_channel_secret")}
									</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<div>
							<h3 className="text-sm font-semibold">
								{t("store_settings_paypal_heading")}
							</h3>
							<p className="text-muted-foreground text-xs">
								{t("store_settings_paypal_intro")}
							</p>
						</div>
						<FormField
							control={form.control}
							name="PAYPAL_CLIENT_ID"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_paypal_client_id")}</FormLabel>
									<FormControl>
										<Input
											autoComplete="off"
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_paypal_client_id_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="PAYPAL_CLIENT_SECRET"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_paypal_client_secret")}
									</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_paypal_client_secret_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<div>
							<h3 className="text-sm font-semibold">
								{t("store_settings_store_logo")}
							</h3>
							<p className="text-muted-foreground text-xs">
								{t("store_settings_store_logo_descr")}
							</p>
						</div>
						<FormField
							control={form.control}
							name="logo"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("logo_url")}</FormLabel>
									<FormControl>
										<Input
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="logoPublicId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("logo_public_id")}</FormLabel>
									<FormControl>
										<Input
											disabled={locked}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500" />
									<FormMessage />
								</FormItem>
							)}
						/>

						<AdminSettingsTabFormFooter>
							<Button
								type="submit"
								disabled={locked || !form.formState.isValid}
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
