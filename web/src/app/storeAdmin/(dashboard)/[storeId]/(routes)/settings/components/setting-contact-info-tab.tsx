"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreSettings } from "@prisma/client";
import type { AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";

import { updateStoreContactInfoAction } from "@/actions/storeAdmin/settings/update-store-contact-info";
import {
	type UpdateStoreContactInfoInput,
	updateStoreContactInfoSchema,
} from "@/actions/storeAdmin/settings/update-store-contact-info.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
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

import type { ContactTabProps } from "./settings-types";

type FormValues = UpdateStoreContactInfoInput;

export const ContactInfoTab: React.FC<ContactTabProps> = ({
	storeSettings,
	onStoreSettingsUpdated,
}) => {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues: FormValues = storeSettings
		? {
				orderNoteToCustomer: storeSettings.orderNoteToCustomer ?? "",
				aboutUs: storeSettings.aboutUs ?? "",
				supportEmail: storeSettings.supportEmail ?? "",
				supportPhoneNumber: storeSettings.supportPhoneNumber ?? "",
				facebookUrl: storeSettings.facebookUrl ?? "",
				igUrl: storeSettings.igUrl ?? "",
				lineId: storeSettings.lineId ?? "",
				telegramId: storeSettings.telegramId ?? "",
				twitterId: storeSettings.twitterId ?? "",
				whatsappId: storeSettings.whatsappId ?? "",
				wechatId: storeSettings.wechatId ?? "",
			}
		: {
				orderNoteToCustomer: "",
				aboutUs: "",
				supportEmail: "",
				supportPhoneNumber: "",
				facebookUrl: "",
				igUrl: "",
				lineId: "",
				telegramId: "",
				twitterId: "",
				whatsappId: "",
				wechatId: "",
			};

	const form = useForm<FormValues>({
		resolver: zodResolver(updateStoreContactInfoSchema) as Resolver<FormValues>,
		defaultValues,
		mode: "onChange",
	});

	const oncontactInfoSubmit = async (data: FormValues) => {
		try {
			setLoading(true);
			const result = await updateStoreContactInfoAction(
				params.storeId as string,
				data,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				onStoreSettingsUpdated?.(
					(result.data.storeSettings as StoreSettings | null | undefined) ??
						null,
				);
				toastSuccess({
					title: t("store_updated"),
					description: "",
				});
			}
		} catch (err: unknown) {
			const error = err as AxiosError;
			toastError({
				title: t("error_title"),
				description: error.message,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardContent
				className="relative pt-6"
				aria-busy={loading || form.formState.isSubmitting}
			>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(oncontactInfoSubmit)}
						className="flex w-full flex-col gap-4 space-y-0"
					>
						<FormField
							control={form.control}
							name="orderNoteToCustomer"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_order_note_to_customer")}
									</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
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
										{t("store_settings_order_note_to_customer_desccr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="aboutUs"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_about_us")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "min-h-[80px] border-destructive focus-visible:ring-destructive"
													: "min-h-[80px]"
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="supportEmail"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_support_email")}</FormLabel>
									<FormControl>
										<Input
											type="email"
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="supportPhoneNumber"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_support_phone")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="facebookUrl"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_facebook_url")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="igUrl"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_ig_url")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="lineId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_support_line_id")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="telegramId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_support_telegram_id")}
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="twitterId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_support_twitter_id")}
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="whatsappId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>
										{t("store_settings_support_whatsapp_id")}
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="wechatId"
							render={({ field, fieldState }) => (
								<FormItem
									className={
										fieldState.error
											? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
											: ""
									}
								>
									<FormLabel>{t("store_settings_support_wechat_id")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											className={
												fieldState.error
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{Object.keys(form.formState.errors).length > 0 && (
							<div className="space-y-1.5 rounded-md border border-destructive/50 bg-destructive/15 p-3">
								<div className="font-semibold text-destructive text-sm">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => (
									<div
										key={field}
										className="flex items-start gap-2 text-destructive text-sm"
									>
										<span className="font-medium">{field}:</span>
										<span>{error.message as string}</span>
									</div>
								))}
							</div>
						)}

						<AdminSettingsTabFormFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.clearErrors();
									router.push("../");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="touch-manipulation disabled:opacity-25"
							>
								{t("cancel")}
							</Button>
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
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
