"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Store, StoreSettings } from "@prisma/client";
import Image from "next/image";

import axios, { type AxiosError } from "axios";
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
import { deleteImage, uploadImage } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { XCircleIcon } from "lucide-react";
import { RequiredProVersion } from "../components/require-pro-version";

const formSchema = z.object({
	customDomain: z.string().optional().default(""),
	LINE_PAY_ID: z.string().optional().default(""),
	LINE_PAY_SECRET: z.string().optional().default(""),
	STRIPE_SECRET_KEY: z.string().optional().default(""),
	logo: z.string().optional().default(""),
	logoPublicId: z.string().default("").optional().default(""),
	acceptAnonymousOrder: z.boolean().optional().default(true),
	defaultTimezone: z.coerce.number().optional().default(8),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	sqlData: Store;
	storeSettings: StoreSettings | null;
	disablePaidOptions: boolean;
	/*
  initialData:
    | (Store & {
        name: string;
      })
    | null;
  logo: string;
  */
}

export const PaidOptionsTab: React.FC<SettingsFormProps> = ({
	sqlData: initialData,
	disablePaidOptions,
}) => {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {
				LINE_PAY_ID: "",
				LINE_PAY_SECRET: "",
				STRIPE_SECRET_KEY: "",
			};

	// Replace null values with undefined
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value ?? undefined,
		]),
	);

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues: sanitizedDefaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onSubmit = async (data: formValues) => {
		console.log("onSubmit", JSON.stringify(data));
		//console.log('logo: ' + image?.name);
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

			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/paidOptions`,
				data,
			);
			router.refresh();
			toast({
				title: t("Store_Updated"),
				description: "",
				variant: "success",
			});
		} catch (error: unknown) {
			const err = error as AxiosError;
			toast({
				title: "Something went wrong.",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			//console.log(data);
		}
	};

	//logo display and image upload
	const [image, setImage] = useState<File | null>(null);
	const [logo, setLogo] = useState<string | null>(initialData?.logo);
	const [logoPublicId, setlogoPublicId] = useState<string | null>(
		initialData?.logoPublicId,
	);
	//console.log(`logo: ${logo}`);
	//console.log(`logoPublicId: ${logoPublicId}`);

	const deleteImageFromClient = async (public_id: string) => {
		// remove logo data from client side
		setLogo(null);
		//setlogoPublicId(null);
	};

	useEffect(() => {
		if (logo === null) {
			setImage(null);
		}
	}, [logo]);

	//console.log("data", JSON.stringify(initialData));
	console.log("disablePaidOptions", disablePaidOptions);
	console.log("form errors", form.formState.errors);

	return (
		<>
			<Card>
				<CardContent
					className="space-y-2 data-[disabled]:text-gary-900 data-[disabled]:bg-gary-900"
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
												<Input
													type="number"
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
									name="acceptAnonymousOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("StoreSettings_acceptAnonymousOrder")}
												</FormLabel>
												<FormDescription>
													{t("StoreSettings_acceptAnonymousOrder_descr")}
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
												{t("StoreSettings_Store_Customer_Domain")}
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

							<FormLabel>{t("StoreSettings_Store_Logo")}</FormLabel>
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
									disablePaidOptions ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("Save")}
							</Button>

							<Button
								disabled={
									loading || form.formState.isSubmitting || disablePaidOptions
								}
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									router.push("../");
								}}
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
