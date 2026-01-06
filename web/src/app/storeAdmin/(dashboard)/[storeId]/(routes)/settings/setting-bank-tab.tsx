"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Store } from "@/types";

import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import * as z from "zod";

import { Button } from "@/components/ui/button";

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

import { useTranslation } from "@/app/i18n/client";
import { TwBankCodeCombobox } from "@/components/tw-bankcode-combobox";
import { useI18n } from "@/providers/i18n-provider";
import { PayoutScheduleCombobox } from "./payout-schedule-combobox";
import type { SettingsFormProps } from "./setting-basic-tab";
import { updateStoreBankAction } from "@/actions/storeAdmin/settings/update-store-bank";
import type { UpdateStoreBankInput } from "@/actions/storeAdmin/settings/update-store-bank.validation";
import { PayoutScheduleNum } from "@/types/enum";

const formSchema = z.object({
	payoutSchedule: z.number(),
	bankCode: z.string().min(3, { message: "bank code is required" }),
	bankAccount: z
		.string()
		.min(8, { message: "account number should be at least 8 digits" }),
	bankAccountName: z.string().min(3, { message: "account name is required" }),
});

type formValues = z.infer<typeof formSchema>;

export const BankSettingTab: React.FC<SettingsFormProps> = ({
	store: initialData,
	onStoreUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {};

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log(`form error: ${JSON.stringify(form.formState.errors)}`);

	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			const payload: Omit<UpdateStoreBankInput, "storeId"> = {
				payoutSchedule: data.payoutSchedule,
				bankCode: data.bankCode,
				bankAccount: data.bankAccount,
				bankAccountName: data.bankAccountName,
			};

			const result = await updateStoreBankAction(
				params.storeId as string,
				payload,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				onStoreUpdated?.(result.data.store as Store);

				toastSuccess({
					title: t("store_updated"),
					description: "",
				});
			}
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: err.message,
			});
		} finally {
			setLoading(false);
			//setIsSubmittable(false);
			//console.log(data);
		}
	};

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="payoutSchedule"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="pr-2">
											{t("StoreSettings_PayoutSchedule")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>

										<FormControl>
											<PayoutScheduleCombobox
												disabled={loading || form.formState.isSubmitting}
												defaultValue={
													field.value ?? Number(PayoutScheduleNum.Manual)
												}
												onChange={field.onChange}
											/>
										</FormControl>

										<FormDescription className="text-xs font-mono text-gray-500">
											{t("StoreSettings_PayoutSchedule_descr")}
										</FormDescription>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="bankCode"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("StoreSettings_BankCode")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<TwBankCodeCombobox
											disabled={loading || form.formState.isSubmitting}
											onValueChange={field.onChange}
											defaultValue={field.value ?? ""}
										/>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="bankAccountName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("StoreSettings_BankAccountName")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="text"
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("StoreSettings_BankAccountName")}
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-8">
								<FormField
									control={form.control}
									name="bankAccount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_BankAccount")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="text"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={t("StoreSettings_BankAccount")}
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Validation Error Summary */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												payoutSchedule:
													t("Payout_Schedule") || "Payout Schedule",
												bankCode: t("Bank_Code") || "Bank Code",
												bankAccount: t("Bank_Account") || "Bank Account",
												bankAccountName:
													t("Bank_Account_Name") || "Bank Account Name",
											};
											const fieldLabel = fieldLabels[field] || field;
											return (
												<div
													key={field}
													className="text-sm text-destructive flex items-start gap-2"
												>
													<span className="font-medium">{fieldLabel}:</span>
													<span>{error.message as string}</span>
												</div>
											);
										},
									)}
								</div>
							)}

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.clearErrors();
									router.push("../");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-2 disabled:opacity-25"
							>
								{t("cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
