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
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { ProductStatusCombobox } from "./product-status-combobox";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import { createStoreProductAction } from "@/actions/storeAdmin/product/create-product";
import { updateProductAction } from "@/actions/storeAdmin/product/update-product";
import {
	createStoreProductSchema,
	type CreateStoreProductInput,
} from "@/actions/storeAdmin/product/create-product.validation";
import {
	updateProductSchema,
	type UpdateProductInput,
} from "@/actions/storeAdmin/product/update-product.validation";
import type { ProductColumn } from "../product-column";

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
	onUpdated?: (product: ProductColumn) => void;
	onCreated?: (product: ProductColumn) => void;
}
export const ProductEditBasicTab = ({
	initialData,
	action,
	onUpdated,
	onCreated,
}: editProps) => {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(initialData);

	const defaultValues = useMemo(
		() =>
			initialData
				? {
						...initialData,
						description: initialData.description ?? "",
						price: Number(initialData.price), // Convert Prisma.Decimal to number
						currency: initialData.currency ?? "usd",
						status: initialData.status ?? Number(ProductStatus.Published),
						isFeatured: initialData.isFeatured ?? false,
					}
				: {
						name: "",
						description: "",
						price: 0,
						currency: "usd",
						isFeatured: false,
						status: Number(ProductStatus.Published),
					},
		[initialData],
	);

	const schema = useMemo(
		() => (isEditMode ? updateProductSchema : createStoreProductSchema),
		[isEditMode],
	);

	type FormInput = Omit<UpdateProductInput, "id" | "storeId"> & {
		id?: string;
		storeId?: string;
	};

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = form;

	const onSubmit = async (data: FormInput) => {
		try {
			setLoading(true);

			if (isEditMode && initialData) {
				// do edit
				const result = await updateProductAction(String(params.storeId), {
					id: initialData.id,
					name: data.name,
					description: data.description ?? "",
					price: data.price,
					currency: data.currency ?? "usd",
					status: data.status,
					isFeatured: data.isFeatured ?? false,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.product) {
					toastSuccess({
						title: t("Product_updated"),
						description: "",
					});
					onUpdated?.(result.data.product);
				}
			} else {
				// do create
				const result = await createStoreProductAction(String(params.storeId), {
					name: data.name,
					description: data.description ?? "",
					price: data.price,
					currency: data.currency ?? "usd",
					status: data.status,
					isFeatured: data.isFeatured ?? false,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.product) {
					toastSuccess({
						title: t("Product_created"),
						description: "",
					});
					// Navigate to the new product page
					router.push(
						`/storeAdmin/${params.storeId}/products/${result.data.product.id}`,
					);
					onCreated?.(result.data.product);
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
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
													min={0}
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
													placeholder={
														t("input_placeholder1") + t("Product_price")
													}
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(event) => {
														const value =
															event.target.value === ""
																? 0
																: Number(event.target.value);
														field.onChange(value);
													}}
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
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("Product_status_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<div>
													<ProductStatusCombobox
														disabled={loading || form.formState.isSubmitting}
														defaultValue={
															field.value ?? Number(ProductStatus.Published)
														}
														onChange={(value) => field.onChange(Number(value))}
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
                        <FormDescription className="text-xs font-mono text-gray-500">
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
                        <FormDescription className="text-xs font-mono text-gray-500">
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
												name: t("Product_Name") || "Product Name",
												description: t("Description") || "Description",
												price: t("Price") || "Price",
												currency: t("Currency") || "Currency",
												status: t("Status") || "Status",
												isFeatured: t("Is_Featured") || "Is Featured",
												categoryId: t("Category") || "Category",
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
									clearErrors();
									router.push(`/storeAdmin/${params.storeId}/products`);
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-5 disabled:opacity-25"
							>
								{t("cancel")}
							</Button>
						</CardContent>
					</Card>
				</form>
			</Form>
		</>
	);
};
