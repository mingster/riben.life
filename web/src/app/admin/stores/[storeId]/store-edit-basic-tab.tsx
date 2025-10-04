"use client";
import { toastError, toastSuccess } from "@/components/Toaster";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import axios, { type AxiosError } from "axios";
import { XCircleIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@radix-ui/react-select";

import type {
	Category,
	Product,
	Store,
	StoreAnnouncement,
	StoreOrder,
	user,
} from "@prisma/client";

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

import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import ImageUploadBox from "@/components/image-upload-box";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { deleteImage, uploadImage } from "@/utils/image-utils";

const formSchema = z.object({
	name: z.string().min(1, { message: "store name is required" }),
	customDomain: z.string().default(""),
	defaultLocale: z.string().min(1),
	defaultCountry: z.string().min(1),
	defaultCurrency: z.string().min(1),
	logo: z.string().default(""),
	logoPublicId: z.string().default(""),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	initialData: Store & {
		Categories: Category[] | [];
		StoreAnnouncement: StoreAnnouncement[] | [];
		Owner: user;
		Products: Product[] | [];
		StoreOrders: StoreOrder[] | [];
	};
	action: string;
}

export const StoreEditBasicTab: React.FC<SettingsFormProps> = ({
	initialData,
	action,
}) => {
	const params = useParams();
	const router = useRouter();

	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const _defaultValues = initialData
		? {
				...initialData,
			}
		: {};
	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			name: "",
			customDomain: "",
			defaultLocale: "",
			defaultCountry: "",
			defaultCurrency: "",
			logo: "",
			logoPublicId: "",
		},
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onSubmit = async (data: formValues) => {
		//console.log('onSubmit: ' + JSON.stringify(data));
		//console.log('logo: ' + image?.name);

		//try {
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

		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}`,
			data,
		);
		router.refresh();

		toastSuccess({
			title: "Store updated.",
			description: "",
		});

		/* } catch (error: unknown) {
	  const err = error as AxiosError;
	  toastError({
		title: "Something went wrong.",
		description: err.message,
	  });
	} finally {
	  setLoading(false);
	  //console.log(data);
	}*/
		setLoading(false);
	};

	//logo display and image upload
	const [image, setImage] = useState<File | null>(null);
	const [logo, setLogo] = useState<string | null>(initialData?.logo);
	const [logoPublicId, _setlogoPublicId] = useState<string | null>(
		initialData.logoPublicId,
	);
	//console.log(`logo: ${logo}`);
	//console.log(`logoPublicId: ${logoPublicId}`);

	useEffect(() => {
		if (logo === null) {
			setImage(null);
		}
	}, [logo]);

	if (!initialData) return;

	const deleteImageFromClient = async (_public_id: string) => {
		// remove logo data from client side
		setLogo(null);
		//setlogoPublicId(null);
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
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Store_Name")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("Store_Name_Descr")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="defaultLocale"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Store_Locale")}</FormLabel>

										<Select
											disabled={loading || form.formState.isSubmitting}
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<SelectTrigger
												className="flex h-9 w-full bg-primary-foreground items-center justify-between whitespace-nowrap rounded-md border border-input
                    px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1
                    focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
											>
												<SelectValue placeholder={t("Store_Locale_Descr")} />
											</SelectTrigger>

											<SelectContent className="bg-primary-foreground">
												<LocaleSelectItems />
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="defaultCurrency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Store_Currency")}</FormLabel>
										<CurrencyCombobox
											disabled={loading || form.formState.isSubmitting}
											onValueChange={field.onChange}
											defaultValue={field.value}
										/>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="defaultCountry"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Store_Country")}</FormLabel>
										<CountryCombobox
											disabled={loading || form.formState.isSubmitting}
											onValueChange={field.onChange}
											defaultValue={field.value}
										/>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="customDomain"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="">
											{t("Store_Customer_Domain")}
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder="google.com"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormLabel>LOGO</FormLabel>

							<div className="flex flex-row w-full">
								<div className="flex flex-col space-y-4 w-1/2">
									<ImageUploadBox
										disabled={loading || form.formState.isSubmitting}
										image={image ?? null}
										setImage={
											setImage ??
											(() => {
												throw new Error("TBD");
											})
										}
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
																disabled={
																	loading || form.formState.isSubmitting
																}
																onClick={() =>
																	deleteImageFromClient(logoPublicId as string)
																}
															>
																<XCircleIcon className="text-red-700" />
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
										render={({ field }) => (
											<FormItem>
												<FormLabel />
											</FormItem>
										)}
									/>
								</div>
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
