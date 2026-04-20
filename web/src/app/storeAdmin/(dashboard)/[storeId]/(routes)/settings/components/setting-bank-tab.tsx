"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { updateStoreBankAction } from "@/actions/storeAdmin/settings/update-store-bank";
import {
	type UpdateStoreBankInput,
	updateStoreBankSchema,
} from "@/actions/storeAdmin/settings/update-store-bank.validation";
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
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";

import { PayoutScheduleCombobox } from "./payout-schedule-combobox";
import type { BankTabProps } from "./settings-types";

export const SettingBankTab: React.FC<BankTabProps> = ({
	store,
	onStoreUpdated,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const defaultValues: UpdateStoreBankInput = {
		payoutSchedule: store.payoutSchedule ?? 0,
		bankCode: store.bankCode ?? "",
		bankAccount: store.bankAccount ?? "",
		bankAccountName: store.bankAccountName ?? "",
	};

	const form = useForm<UpdateStoreBankInput>({
		resolver: zodResolver(
			updateStoreBankSchema,
		) as Resolver<UpdateStoreBankInput>,
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: UpdateStoreBankInput) {
		setLoading(true);
		try {
			const result = await updateStoreBankAction(String(params.storeId), data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("settings_saved") });
			if (result?.data?.store) {
				onStoreUpdated?.(result.data.store as Store);
				form.reset({
					payoutSchedule: result.data.store.payoutSchedule ?? 0,
					bankCode: result.data.store.bankCode ?? "",
					bankAccount: result.data.store.bankAccount ?? "",
					bankAccountName: result.data.store.bankAccountName ?? "",
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
							name="payoutSchedule"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_payout_schedule")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<PayoutScheduleCombobox
											key={field.value}
											disabled={loading}
											defaultValue={field.value}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("store_settings_payout_schedule_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="bankCode"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_bank_code")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading}
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

						<FormField
							control={form.control}
							name="bankAccount"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_bank_account")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading}
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

						<FormField
							control={form.control}
							name="bankAccountName"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_bank_account_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading}
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
