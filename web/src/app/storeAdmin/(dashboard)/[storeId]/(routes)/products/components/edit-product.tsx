"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
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
import { ProductStatusCombobox } from "../[productId]/product-status-combobox";

interface EditProductProps {
	product?: ProductColumn | null;
	isNew?: boolean;
	onCreated?: (product: ProductColumn) => void;
	onUpdated?: (product: ProductColumn) => void;
	trigger?: React.ReactNode;
}

export const EditProduct: React.FC<EditProductProps> = ({
	product = null,
	isNew = false,
	onCreated,
	onUpdated,
	trigger,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(product) && !isNew;

	const defaultValues = product
		? {
				...product,
				id: product.id ?? "",
			}
		: {
				storeId: String(params.storeId),
				name: "",
				description: "",
				price: 0,
				currency: "twd",
				status: Number(ProductStatus.Published),
				isFeatured: false,
			};

	const schema = useMemo(
		() => (isEditMode ? updateProductSchema : createStoreProductSchema),
		[isEditMode],
	);
	type FormInput = Omit<UpdateProductInput, "id"> & { id?: string };

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (value: boolean) => {
		setOpen(value);
		if (!value) {
			resetForm();
			form.clearErrors();
		} else {
			// Reset form and clear errors when opening dialog
			form.reset(defaultValues);
			form.clearErrors();
		}
	};

	const handleSuccess = (updatedProduct: ProductColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedProduct);
		} else {
			onCreated?.(updatedProduct);
		}

		toastSuccess({
			title: t("Product_" + (isEditMode ? "updated" : "created")),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (data: FormInput) => {
		// Client-side validation is handled by react-hook-form
		// This will only be called if validation passes
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createStoreProductAction(
					String(params.storeId),
					{
						name: data.name,
						description: data.description ?? "",
						price: data.price,
						currency: data.currency ?? "usd",
						status: data.status,
						isFeatured: data.isFeatured ?? false,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.product) {
					handleSuccess(result.data.product);
				}
			} else {
				const productId = product?.id;
				if (!productId) {
					toastError({
						title: t("error_title"),
						description: "Product not found.",
					});
					return;
				}

				const result = await updateProductAction(
					String(params.storeId),
					{
						id: productId,
						name: data.name,
						description: data.description ?? "",
						price: data.price,
						currency: data.currency ?? "usd",
						status: data.status,
						isFeatured: data.isFeatured ?? false,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.product) {
					handleSuccess(result.data.product);
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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button variant="outline">
						<IconPlus className="mr-0 size-4" />
						{isNew ? t("create") : t("edit")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isNew ? t("create") : t("Product_mgmt_edit")}
					</DialogTitle>
					<DialogDescription>{t("Product_mgmt_add_descr")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, (errors) => {
							// Show validation errors when form is invalid
							const firstErrorKey = Object.keys(errors)[0];
							if (firstErrorKey) {
								const error = errors[firstErrorKey as keyof typeof errors];
								const errorMessage = error?.message;
								if (errorMessage) {
									toastError({
										title: t("error_title"),
										description: errorMessage,
									});
								}
							}
						})}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Product_name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("input_placeholder1") + t("Product_name")}
											disabled={loading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Product_description")}</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("Product_description_placeholder")}
											disabled={loading}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("Product_description_helper")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="price"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Product_price")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												step="0.01"
												disabled={loading}
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

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Product_status")}</FormLabel>
										<FormControl>
											<div>
												<ProductStatusCombobox
													disabled={loading}
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
						</div>

						<FormField
							control={form.control}
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg">
									<div className="space-y-0.5">
										<FormLabel>{t("Product_featured")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("Product_isFeatured_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter className="flex flex-row justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{loading || form.formState.isSubmitting
									? t("Saving...")
									: isNew
										? t("create")
										: t("save")}
							</Button>
							<Button
								variant="outline"
								type="button"
								disabled={loading}
								onClick={() => handleOpenChange(false)}
							>
								{t("cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default EditProduct;
