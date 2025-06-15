"use client";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";

import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import * as z from "zod";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingsFormProps } from "./setting-basic-tab";

const contactInfoFormSchema = z.object({
	aboutUs: z.string().optional().default(""),
	supportEmail: z.string().optional().default(""),
	supportPhoneNumber: z.string().optional().default(""),
	facebookUrl: z.string().optional().default(""),
	igUrl: z.string().optional().default(""),
	lineId: z.string().optional().default(""),
	telegramId: z.string().optional().default(""),
	twitterId: z.string().optional().default(""),
	whatsappId: z.string().optional().default(""),
	wechatId: z.string().optional().default(""),
});

type formValues = z.infer<typeof contactInfoFormSchema>;

export const ContactInfoTab: React.FC<SettingsFormProps> = ({
	sqlData: initialData,
	storeSettings,
}) => {
	const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const defaultValues = storeSettings
		? {
				///...initialData,
				...storeSettings,
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

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));

	const form = useForm<formValues>({
		resolver: zodResolver(contactInfoFormSchema) as any,
		defaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;
	const oncontactInfoSubmit = async (data: formValues) => {
		console.log(`contactInfo onSubmit: ${JSON.stringify(data)}`);

		try {
			setLoading(true);

			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/contactInfo`,
				data,
			);
			router.refresh();
			toastSuccess({
				title: t("Store_Updated"),
				description: "",
			});
		} catch (err: unknown) {
			const error = err as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: error.message,
			});
		} finally {
			setLoading(false);
			//console.log(data);
		}
	};

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(oncontactInfoSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="aboutUs"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreSettings_about_us")}</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={`${t("input_placeholder1")}${t("StoreSettings_about_us")}`}
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
									name="supportEmail"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_support_email")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_email")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="supportPhoneNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_support_phone")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_phone")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-8">
								<FormField
									control={form.control}
									name="facebookUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_facebook_url")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_facebook_url")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="igUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_ig_url")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_ig_url")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-8">
								<FormField
									control={form.control}
									name="lineId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_support_lineId")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_lineId")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="telegramId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_support_telegramId")}
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_telegramId")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-8">
								<FormField
									control={form.control}
									name="twitterId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_support_twitterId")}
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_twitterId")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="whatsappId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_support_whatsappId")}
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_whatsappId")}`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="wechatId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreSettings_support_wechatId")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_wechatId")}`}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
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
								className="ml-5 disabled:opacity-25"
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
