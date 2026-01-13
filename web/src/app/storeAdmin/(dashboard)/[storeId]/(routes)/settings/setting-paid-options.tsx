"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";

import Image from "next/image";

import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useTranslation } from "@/app/i18n/client";
import ImageUploadBox from "@/components/image-upload-box";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/providers/i18n-provider";
import { deleteImage, uploadImage } from "@/utils/image-utils";
import { IconX } from "@tabler/icons-react";
import { RequiredProVersion } from "../components/require-pro-version";
import { StoreSettings } from "@prisma/client";
import { Store } from "@/types";
import { updateStorePaidOptionsAction } from "@/actions/storeAdmin/settings/update-store-paid-options";
import type { UpdateStorePaidOptionsInput } from "@/actions/storeAdmin/settings/update-store-paid-options.validation";
import { TimezoneSelect } from "@/components/timezone-select";

const formSchema = z.object({
	customDomain: z.string().optional().default(""),
	LINE_PAY_ID: z.string().optional().default(""),
	LINE_PAY_SECRET: z.string().optional().default(""),
	STRIPE_SECRET_KEY: z.string().optional().default(""),
	logo: z.string().optional().default(""),
	logoPublicId: z.string().default("").optional().default(""),
	acceptAnonymousOrder: z.boolean().optional().default(true),
	defaultTimezone: z.string().optional().default("Asia/Taipei"),
});

type formValues = z.infer<typeof formSchema>;

export interface PaidOptionsSettingsProps {
	store: Store;
	storeSettings: StoreSettings | null;
	disablePaidOptions: boolean;
	onStoreUpdated?: (store: Store) => void;
}
export const PaidOptionsTab: React.FC<PaidOptionsSettingsProps> = ({
	store,
	storeSettings,
	disablePaidOptions,
	onStoreUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const defaultValues = store
		? {
				...store,
			}
		: {
				LINE_PAY_ID: "",
				LINE_PAY_SECRET: "",
				STRIPE_SECRET_KEY: "",
			};

	// Replace null values with empty strings for string fields
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value === null ? "" : value,
		]),
	);

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: sanitizedDefaultValues,
	});

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			if (image) {
				const result = await uploadImage("logo", image, 120, 40);
				//console.log('upload result: ' + JSON.stringify(res));
				data.logoPublicId = result.public_id;
				data.logo = result.secure_url;
			}

			//empty logo if user press the logo delete button
			if (logo === null) {
				// remove from clondinary
				deleteImage(data.logoPublicId as string);

				//empty the param in database
				data.logo = "";
				data.logoPublicId = "";
			}

			//console.log('logo: ' + data.logo);
			//console.log('logoPublicId: ' + data.logoPublicId);
			//console.log('onSubmit: ' + JSON.stringify(data));

			const payload: Omit<UpdateStorePaidOptionsInput, "storeId"> = {
				customDomain: data.customDomain ?? "",
				LINE_PAY_ID: data.LINE_PAY_ID ?? "",
				LINE_PAY_SECRET: data.LINE_PAY_SECRET ?? "",
				STRIPE_SECRET_KEY: data.STRIPE_SECRET_KEY ?? "",
				logo: data.logo ?? "",
				logoPublicId: data.logoPublicId ?? "",
				acceptAnonymousOrder: data.acceptAnonymousOrder ?? true,
				defaultTimezone:
					data.defaultTimezone ?? store.defaultTimezone ?? "Asia/Taipei",
			};

			const result = await updateStorePaidOptionsAction(
				params.storeId as string,
				payload,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				const updatedStore = result.data.store as Store;
				onStoreUpdated?.(updatedStore);
				setLogo(updatedStore.logo ?? null);

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
			//console.log(data);
		}
	};

	//logo display and image upload
	const [image, setImage] = useState<File | null>(null);
	const [logo, setLogo] = useState<string | null>(store?.logo);
	const [logoPublicId, _setlogoPublicId] = useState<string | null>(
		store?.logoPublicId,
	);
	//console.log(`logo: ${logo}`);
	//console.log(`logoPublicId: ${logoPublicId}`);

	const deleteImageFromClient = async (_public_id: string) => {
		// remove logo data from client side
		setLogo(null);
		//setlogoPublicId(null);
	};

	useEffect(() => {
		if (logo === null) {
			setImage(null);
		}
	}, [logo]);

	// Form validation handled by react-hook-form

	return (
		<>
			<Card>
				<CardContent
					className="space-y-2 data-disabled:text-gary-900 data-disabled:bg-gary-900"
					data-disabled={disablePaidOptions}
				>
					{disablePaidOptions && <RequiredProVersion />}

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="LINE_PAY_ID"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="">LINE_PAY_ID</FormLabel>
											<FormControl>
												<Input
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
													className="font-mono"
													placeholder=""
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="LINE_PAY_SECRET"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="">LINE_PAY_SECRET</FormLabel>
											<FormControl>
												<Input
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
													className="font-mono"
													placeholder=""
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="STRIPE_SECRET_KEY"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="">STRIPE_SECRET_KEY</FormLabel>
											<FormControl>
												<Input
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
													className="font-mono"
													placeholder=""
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultTimezone"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="">Timezone</FormLabel>
											<FormControl>
												<TimezoneSelect
													value={field.value ?? "Asia/Taipei"}
													onValueChange={field.onChange}
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="acceptAnonymousOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
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
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="customDomain"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="">
												{t("store_settings_store_customer_domain")}
											</FormLabel>
											<FormControl>
												<Input
													disabled={
														loading ||
														form.formState.isSubmitting ||
														disablePaidOptions
													}
													className="font-mono"
													placeholder="google.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="mb-2">
								<Label>{t("store_settings_store_logo")}</Label>
							</div>
							<div className="flex flex-row w-full">
								<div className="flex flex-col space-y-4 w-1/2">
									<ImageUploadBox
										disabled={
											loading ||
											form.formState.isSubmitting ||
											disablePaidOptions
										}
										image={image ?? null}
										setImage={setImage ?? (() => {})}
									/>
								</div>
								<div className="flex flex-col pl-10 space-y-4 place-content-center">
									<FormField
										control={form.control}
										name="logo"
										render={({ field }) => (
											<FormItem>
												{logo && (
													<div className="relative h-[40px] w-[120px] overflow-hidden">
														<div className="absolute right-1 top-2 z-10">
															<Button
																variant="ghost"
																size="icon"
																type="button"
																className="disabled:opacity-25 disabled:cursor-not-allowed disabled:text-gary-100"
																disabled={
																	loading ||
																	form.formState.isSubmitting ||
																	disablePaidOptions
																}
																onClick={() =>
																	deleteImageFromClient(logoPublicId as string)
																}
															>
																<IconX className="text-red-700" />
															</Button>
														</div>

														<Image
															src={logo}
															alt="logo"
															width={120}
															height={40}
															priority={false}
															className="object-cover"
														/>
													</div>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="logoPublicId"
										render={({ field }) => <FormItem></FormItem>}
									/>
								</div>
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
												customDomain: t("Custom_Domain") || "Custom Domain",
												LINE_PAY_ID: t("LINE_PAY_ID") || "LINE Pay ID",
												LINE_PAY_SECRET:
													t("LINE_PAY_SECRET") || "LINE Pay Secret",
												STRIPE_SECRET_KEY:
													t("STRIPE_SECRET_KEY") || "Stripe Secret Key",
												logo: t("Logo") || "Logo",
												logoPublicId: t("Logo_Public_ID") || "Logo Public ID",
												acceptAnonymousOrder:
													t("store_settings_accept_anonymous_order") ||
													"Accept Anonymous Order",
												defaultTimezone:
													t("Default_Timezone") || "Default Timezone",
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
									disablePaidOptions ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("save")}
							</Button>

							<Button
								disabled={
									loading || form.formState.isSubmitting || disablePaidOptions
								}
								type="button"
								variant="outline"
								onClick={() => {
									form.clearErrors();
									router.push("../");
								}}
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
