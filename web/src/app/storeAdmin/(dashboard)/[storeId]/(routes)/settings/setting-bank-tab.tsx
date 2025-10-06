"use client";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Store, StoreSettings } from "@prisma/client";

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

const formSchema = z.object({
	payoutSchedule: z.number(),
	bankCode: z.string().min(3, { message: "bank code is required" }),
	bankAccount: z
		.string()
		.min(8, { message: "account number should be at least 8 digits" }),
	bankAccountName: z.string().min(3, { message: "account name is required" }),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	sqlData: Store;
	storeSettings: StoreSettings | null;
}

export const BankSettingTab: React.FC<SettingsFormProps> = ({
	sqlData: initialData,
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

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	//console.log(`form error: ${JSON.stringify(form.formState.errors)}`);

	const onSubmit = async (data: formValues) => {
		console.log(`onSubmit: ${JSON.stringify(data)}`);

		try {
			setLoading(true);

			//console.log('onSubmit: ' + JSON.stringify(data));

			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/bank`,
				data,
			);

			router.refresh();

			//revalidatePath('/[storeId]', 'page');

			toastSuccess({
				title: t("Store_Updated"),
				description: "",
			});
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
											{t("StoreSettings_PayoutSchedule")}
										</FormLabel>

										<FormControl>
											<PayoutScheduleCombobox
												disabled={loading || form.formState.isSubmitting}
												defaultValue={field.value}
												onChange={field.onChange}
											/>
										</FormControl>

										<FormDescription>
											{t("StoreSettings_PayoutSchedule_Descr")}
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
										<FormLabel>{t("StoreSettings_BankCode")}</FormLabel>
										<TwBankCodeCombobox
											disabled={loading || form.formState.isSubmitting}
											onValueChange={field.onChange}
											defaultValue={field.value}
										/>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="bankAccountName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreSettings_BankAccountName")}</FormLabel>
										<FormControl>
											<Input
												type="text"
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("StoreSettings_BankAccountName")}
												{...field}
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
											<FormLabel>{t("StoreSettings_BankAccount")}</FormLabel>
											<FormControl>
												<Input
													type="text"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={t("StoreSettings_BankAccount")}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("Save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									router.push("../");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-2 disabled:opacity-25"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
