"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

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
import { zodResolver } from "@hookform/resolvers/zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@/types";
import { Prisma } from "@prisma/client";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ProductStatusCombobox } from "./product-status-combobox";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";

const formSchema = z.object({
	//storeId: z.string().optional().default(""),
	name: z.string().min(1, { message: "product name is required" }),
	description: z.string().optional().default(""),
	price: z.number().min(1),
	currency: z.string().optional().default("usd"),
	isFeatured: z.boolean().default(false).optional(),
	useOption: z.boolean().default(true).optional(),
	status: z.number(),
	//productAttribute: productAttributeModel.optional(),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData:
		| (Product & {
				//images: ProductImage[];
				//productPrices: ProductPrice[];
				//ProductImages: ProductImages[] | null;
				//ProductAttribute: ProductAttribute | null;
		  })
		| null;
	action: string;
}
export const ProductEditBasicTab = ({ initialData, action }: editProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	//const [open, setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
				description: initialData.description ?? undefined,
				price: Number(initialData.price), // Convert Prisma.Decimal to number
			}
		: {
				name: "",
				description: undefined,
				price: new Prisma.Decimal(0.0).toNumber(), // Convert Prisma.Decimal to number
				currency: "usd",
				isFeatured: false,
				status: Number(ProductStatus.Published),
			};

	//console.log(`product basic: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();
	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);
			//console.log(`onSubmit: ${JSON.stringify(data)}`);
			if (initialData) {
				// do edit
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${initialData.id}`,
					data,
				);
				toastSuccess({
					title: t("Product_updated"),
					description: "",
				});
				router.refresh();
			} else {
				// do create
				const obj = await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product`,
					data,
				);

				//console.log(`create product: ${JSON.stringify(obj)}`);

				toastSuccess({
					title: t("Product_created"),
					description: "",
				});
				router.push(`/storeAdmin/${params.storeId}/products/${obj.data.id}`);
				router.refresh();
			}
		} catch (err: unknown) {
			const error = err as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: error.message,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="w-full space-y-1"
				>
					<Card>
						<CardContent className="space-y-2">
							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>{t("Product_name")}</FormLabel>
											<FormControl>
												<Input
													type="text"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder={
														t("input_placeholder1") + t("Product_name")
													}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="price"
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>{t("Product_price")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													//disabled={loading || form.watch("useOption")}
													disabled={loading || form.formState.isSubmitting}
													className="font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
													placeholder={
														t("input_placeholder1") + t("Product_price")
													}
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
								name="description"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormLabel>{t("Product_description")}</FormLabel>
										<FormControl>
											<Input
												type="text"
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={
													t("input_placeholder1") + t("Product_description")
												}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-1 leading-none">
												<FormLabel>{t("Product_status")}</FormLabel>
												<FormDescription>
													{t("Product_status_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<div>
													<ProductStatusCombobox
														disabled={loading || form.formState.isSubmitting}
														defaultValue={field.value}
														onChange={field.onChange}
													/>
												</div>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>
								{/*
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>{t("Product_isFeatured")}</FormLabel>
                        <FormDescription>
                          {t("Product_isFeatured_descr")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                /> */}
								{/*
                <FormField
                  control={form.control}
                  name="useOption"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>{t("Product_useOption")}</FormLabel>
                        <FormDescription>
                          {t("Product_useOption_descr")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          ref={field.ref}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 */}
							</div>

							<Separator />

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
									router.push(`/storeAdmin/${params.storeId}/products`);
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-5 disabled:opacity-25"
							>
								{t("Cancel")}
							</Button>
						</CardContent>
					</Card>
				</form>
			</Form>
		</>
	);
};
