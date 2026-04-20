"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createStoreProductAction } from "@/actions/storeAdmin/product/create-product";
import {
	type CreateStoreProductInput,
	createStoreProductSchema,
} from "@/actions/storeAdmin/product/create-product.validation";
import { updateProductAction } from "@/actions/storeAdmin/product/update-product";
import { updateProductSchema } from "@/actions/storeAdmin/product/update-product.validation";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import type { ProductColumn } from "../product-column";
import { ProductDescriptionMdEditor } from "./product-description-md-editor";
import { ProductStatusCombobox } from "./product-status-combobox";

type ProductFormValues = CreateStoreProductInput & { id?: string };

const DEFAULT_ATTRIBUTE_EXTRAS: Pick<
	ProductFormValues,
	| "attributeWeight"
	| "attributeStock"
	| "attributeDisplayStockAvailability"
	| "attributeDisplayStockQuantity"
	| "attributeAllowBackOrder"
	| "attributeOrderMinQuantity"
	| "attributeOrderMaxQuantity"
	| "attributeDisableBuyButton"
	| "attributeIsBrandNew"
	| "attributeIsShipRequired"
	| "attributeIsFreeShipping"
	| "attributeAdditionalShipCost"
	| "attributeAvailableEndDate"
	| "attributeIsCreditTopUp"
	| "attributeIsRecurring"
	| "attributeInterval"
	| "attributeIntervalCount"
	| "attributeTrialPeriodDays"
	| "attributeStripePriceId"
> = {
	attributeWeight: 0,
	attributeStock: 0,
	attributeDisplayStockAvailability: false,
	attributeDisplayStockQuantity: false,
	attributeAllowBackOrder: false,
	attributeOrderMinQuantity: 1,
	attributeOrderMaxQuantity: 0,
	attributeDisableBuyButton: false,
	attributeIsBrandNew: true,
	attributeIsShipRequired: false,
	attributeIsFreeShipping: false,
	attributeAdditionalShipCost: 0,
	attributeAvailableEndDate: "",
	attributeIsCreditTopUp: false,
	attributeIsRecurring: false,
	attributeInterval: null,
	attributeIntervalCount: null,
	attributeTrialPeriodDays: null,
	attributeStripePriceId: "",
};

function mapProductColumnToFormValues(
	product: ProductColumn | null | undefined,
): ProductFormValues {
	if (product) {
		return {
			id: product.id,
			name: product.name ?? "",
			description: product.description ?? "",
			careContent: product.careContent ?? "",
			price: product.price,
			currency: product.currency ?? "twd",
			status: product.status,
			isFeatured: product.isFeatured,
			slug: product.slug ?? "",
			compareAtPrice: product.compareAtPrice,
			specsJsonText: product.specsJsonText ?? "",
			attributeLength: product.attributeLength ?? 0,
			attributeHeight: product.attributeHeight ?? 0,
			attributeWidth: product.attributeWidth ?? 0,
			attributeMfgPartNumber: product.attributeMfgPartNumber ?? "",
			relatedProductIdsText: product.relatedProductIdsText ?? "",
			attributeWeight: product.attributeWeight,
			attributeStock: product.attributeStock,
			attributeDisplayStockAvailability:
				product.attributeDisplayStockAvailability,
			attributeDisplayStockQuantity: product.attributeDisplayStockQuantity,
			attributeAllowBackOrder: product.attributeAllowBackOrder,
			attributeOrderMinQuantity: product.attributeOrderMinQuantity,
			attributeOrderMaxQuantity: product.attributeOrderMaxQuantity,
			attributeDisableBuyButton: product.attributeDisableBuyButton,
			attributeIsBrandNew: product.attributeIsBrandNew,
			attributeIsShipRequired: product.attributeIsShipRequired,
			attributeIsFreeShipping: product.attributeIsFreeShipping,
			attributeAdditionalShipCost: product.attributeAdditionalShipCost,
			attributeAvailableEndDate: product.attributeAvailableEndDate,
			attributeIsCreditTopUp: product.attributeIsCreditTopUp,
			attributeIsRecurring: product.attributeIsRecurring,
			attributeInterval: product.attributeInterval,
			attributeIntervalCount: product.attributeIntervalCount,
			attributeTrialPeriodDays: product.attributeTrialPeriodDays,
			attributeStripePriceId: product.attributeStripePriceId,
		};
	}
	return {
		name: "",
		description: "",
		careContent: "",
		price: 0,
		currency: "twd",
		status: Number(ProductStatus.Published),
		isFeatured: false,
		slug: "",
		compareAtPrice: null,
		specsJsonText: "",
		attributeLength: 0,
		attributeHeight: 0,
		attributeWidth: 0,
		attributeMfgPartNumber: "",
		relatedProductIdsText: "",
		...DEFAULT_ATTRIBUTE_EXTRAS,
	};
}

interface EditProductProps {
	product?: ProductColumn | null;
	isNew?: boolean;
	onCreated?: (product: ProductColumn) => void;
	onUpdated?: (product: ProductColumn) => void;
	trigger?: React.ReactNode;
	/** When true, dialog starts open and no trigger is rendered (e.g. product detail route). */
	hideTrigger?: boolean;
	initialOpen?: boolean;
	onDialogClose?: () => void;
	/** Inline card layout for tabbed product editor (no dialog shell). */
	layout?: "dialog" | "inline";
	/** Which fields to show when `layout` is `inline`. Ignored for dialog (always full form). */
	formSections?: "all" | "basic" | "attribute" | "related";
	inlineTitle?: string;
	inlineDescription?: string;
	onInlineCancel?: () => void;
}

export function EditProduct({
	product = null,
	isNew = false,
	onCreated,
	onUpdated,
	trigger,
	hideTrigger = false,
	initialOpen = false,
	onDialogClose,
	layout = "dialog",
	formSections = "all",
	inlineTitle,
	inlineDescription,
	onInlineCancel,
}: EditProductProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(Boolean(hideTrigger && initialOpen));
	const [loading, setLoading] = useState(false);

	const effectiveSections =
		layout === "inline" ? formSections : ("all" as const);
	const showBasic =
		effectiveSections === "all" || effectiveSections === "basic";
	const showAttribute =
		effectiveSections === "all" || effectiveSections === "attribute";
	const showRelated =
		effectiveSections === "all" || effectiveSections === "related";

	useEffect(() => {
		if (hideTrigger && initialOpen) {
			setOpen(true);
		}
	}, [hideTrigger, initialOpen]);

	const isEditMode =
		Boolean(product) &&
		!isNew &&
		product?.id !== undefined &&
		product.id !== "new";

	const defaultValues: ProductFormValues = useMemo(
		() => mapProductColumnToFormValues(product),
		[product],
	);

	const schema = useMemo(
		() => (isEditMode ? updateProductSchema : createStoreProductSchema),
		[isEditMode],
	);
	const form = useForm<ProductFormValues>({
		resolver: zodResolver(schema) as Resolver<ProductFormValues>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (value: boolean) => {
		setOpen(value);
		if (!value) {
			resetForm();
			form.clearErrors();
			onDialogClose?.();
		} else {
			form.reset(defaultValues);
			form.clearErrors();
		}
	};

	const handleSuccess = (updatedProduct: ProductColumn) => {
		const merged: ProductColumn = {
			...updatedProduct,
			images:
				updatedProduct.images?.length > 0
					? updatedProduct.images
					: (product?.images ?? []),
			productOptions:
				updatedProduct.productOptions ?? product?.productOptions ?? [],
		};
		if (isEditMode) {
			onUpdated?.(merged);
		} else {
			onCreated?.(merged);
		}

		toastSuccess({
			title: t(isEditMode ? "product_updated" : "product_created"),
			description: "",
		});

		if (layout === "inline") {
			form.reset(mapProductColumnToFormValues(merged));
		} else {
			resetForm();
		}
		if (!hideTrigger) {
			handleOpenChange(false);
		}
	};

	const onSubmit = async (data: ProductFormValues) => {
		try {
			setLoading(true);
			const storeId = String(params.storeId);

			if (!isEditMode) {
				const { relatedProductIdsText: _related, id: _id, ...rest } = data;
				void _related;
				void _id;
				const createPayload = createStoreProductSchema.parse({
					...rest,
					relatedProductIdsText: _related ?? "",
				});
				const result = await createStoreProductAction(storeId, createPayload);

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

				const updatePayload = updateProductSchema.parse({
					...data,
					id: data.id ?? productId,
				});
				const result = await updateProductAction(storeId, updatePayload);

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

	const headerTitle = inlineTitle ?? (isNew ? t("create") : t("edit"));
	const headerDescription = inlineDescription ?? t("product_mgmt_edit_descr");

	const formBlock = (
		<div
			className="relative"
			aria-busy={loading || form.formState.isSubmitting}
		>
			<FormSubmitOverlay
				visible={loading || form.formState.isSubmitting}
				statusText={t("saving")}
			/>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit, (errors) => {
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
					{isEditMode && product?.id ? (
						<input type="hidden" {...form.register("id")} />
					) : null}

					{showBasic ? (
						<>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("product_name")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												placeholder={t("product_name")}
												disabled={loading}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
										<FormLabel>{t("product_description")}</FormLabel>
										<FormControl>
											<ProductDescriptionMdEditor
												value={field.value ?? ""}
												onChange={field.onChange}
												disabled={loading}
												placeholder={t("product_description_placeholder")}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_description_helper")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_slug_label")}</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g. all-in-gm-monogram"
												disabled={loading}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation font-mono text-sm"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_slug_descr")}
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
											<FormLabel>
												{t("product_price")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.01"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
											<FormLabel>{t("product_status")}</FormLabel>
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
								name="compareAtPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_compare_at_price_label")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												step="0.01"
												disabled={loading}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												value={
													field.value === null || field.value === undefined
														? ""
														: field.value
												}
												onChange={(event) => {
													const raw = event.target.value;
													field.onChange(raw === "" ? null : Number(raw));
												}}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_compare_at_price_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isFeatured"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg">
										<div className="space-y-0.5">
											<FormLabel>{t("product_featured")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_is_featured_descr")}
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
						</>
					) : null}

					{showAttribute ? (
						<>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="attributeLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_length_cm")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.1"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeHeight"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_height_cm")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.1"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeWidth"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_width_cm")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.1"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="attributeMfgPartNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_mfg_reference_label")}</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g. M13044"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation font-mono text-sm"
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
									name="attributeWeight"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_weight_kg")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.001"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="attributeDisplayStockAvailability"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_display_stock_availability")}
												</FormLabel>
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
								<FormField
									control={form.control}
									name="attributeDisplayStockQuantity"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_display_stock_quantity")}
												</FormLabel>
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
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="attributeStock"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_stock")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeAllowBackOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_allow_back_order")}
												</FormLabel>
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
							</div>

							<div className="grid grid-cols-1 items-start justify-between gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="attributeOrderMinQuantity"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_attribute_order_min_quantity")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 1
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeOrderMaxQuantity"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_attribute_order_max_quantity")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_attribute_order_max_quantity_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 items-start justify-between gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="attributeDisableBuyButton"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_disable_buy_button")}
												</FormLabel>
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
								<FormField
									control={form.control}
									name="attributeIsBrandNew"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_is_brand_new")}
												</FormLabel>
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
							</div>
							<div className="grid grid-cols-1 items-end justify-between gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="attributeIsShipRequired"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_ship_required")}
												</FormLabel>
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
								<FormField
									control={form.control}
									name="attributeIsFreeShipping"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													{t("product_attribute_free_shipping")}
												</FormLabel>
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

								<FormField
									control={form.control}
									name="attributeAdditionalShipCost"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_attribute_additional_shipping_cost")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.01"
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={Number.isNaN(field.value) ? "" : field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="attributeAvailableEndDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("product_attribute_available_end_date")}
										</FormLabel>
										<FormControl>
											<Input
												type="datetime-local"
												disabled={loading}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_attribute_available_end_date_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="attributeIsCreditTopUp"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
										<div className="space-y-0.5">
											<FormLabel>
												{t("product_attribute_is_credit_top_up")}
											</FormLabel>
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
							<FormField
								control={form.control}
								name="attributeIsRecurring"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
										<div className="space-y-0.5">
											<FormLabel>
												{t("product_attribute_is_recurring")}
											</FormLabel>
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

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="attributeInterval"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_attribute_interval")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={
														field.value === null || field.value === undefined
															? ""
															: field.value
													}
													onChange={(e) => {
														const raw = e.target.value;
														field.onChange(raw === "" ? null : Number(raw));
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeIntervalCount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_attribute_interval_count")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={
														field.value === null || field.value === undefined
															? ""
															: field.value
													}
													onChange={(e) => {
														const raw = e.target.value;
														field.onChange(raw === "" ? null : Number(raw));
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="attributeTrialPeriodDays"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_attribute_trial_period_days")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step={1}
													disabled={loading}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													value={
														field.value === null || field.value === undefined
															? ""
															: field.value
													}
													onChange={(e) => {
														const raw = e.target.value;
														field.onChange(raw === "" ? null : Number(raw));
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
								name="careContent"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_care_content")}</FormLabel>
										<FormControl>
											<ProductDescriptionMdEditor
												value={field.value ?? ""}
												onChange={field.onChange}
												disabled={loading}
												placeholder={t("product_care_content_placeholder")}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_care_content_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="specsJsonText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_specs_json_label")}</FormLabel>
										<FormControl>
											<Textarea
												placeholder='e.g. { "Material": "Leather", "Made in": "France" }'
												disabled={loading}
												className="min-h-[100px] font-mono text-sm"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_specs_json_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="attributeStripePriceId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("product_attribute_stripe_price_id")}
										</FormLabel>
										<FormControl>
											<Input
												placeholder="price_..."
												disabled={loading}
												className="h-10 sm:h-9 sm:text-sm touch-manipulation font-mono text-sm"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</>
					) : null}

					{isEditMode && showRelated ? (
						<FormField
							control={form.control}
							name="relatedProductIdsText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("product_related_product_ids_label")}
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="One product ID per line (same store)"
											disabled={loading}
											className="min-h-[80px] font-mono text-xs"
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("product_related_product_ids_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					) : null}

					{Object.keys(form.formState.errors).length > 0 && (
						<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
							<div className="text-sm font-semibold text-destructive">
								{t("please_fix_validation_errors")}
							</div>
							{Object.entries(form.formState.errors).map(([field, error]) => {
								const fieldLabels: Record<string, string> = {
									name: t("product_name"),
									description: t("product_description"),
									price: t("product_price"),
									careContent: t("product_care_content"),
									slug: t("product_slug_label"),
									compareAtPrice: t("product_compare_at_price_label"),
									specsJsonText: t("product_specs_json_label"),
									attributeLength: t("product_attribute_length_cm"),
									attributeHeight: t("product_attribute_height_cm"),
									attributeWidth: t("product_attribute_width_cm"),
									attributeMfgPartNumber: t("product_mfg_reference_label"),
									relatedProductIdsText: t("product_related_product_ids_label"),
									attributeWeight: t("product_attribute_weight_kg"),
									attributeStock: t("product_attribute_stock"),
									attributeDisplayStockAvailability: t(
										"product_attribute_display_stock_availability",
									),
									attributeDisplayStockQuantity: t(
										"product_attribute_display_stock_quantity",
									),
									attributeAllowBackOrder: t(
										"product_attribute_allow_back_order",
									),
									attributeOrderMinQuantity: t(
										"product_attribute_order_min_quantity",
									),
									attributeOrderMaxQuantity: t(
										"product_attribute_order_max_quantity",
									),
									attributeDisableBuyButton: t(
										"product_attribute_disable_buy_button",
									),
									attributeIsBrandNew: t("product_attribute_is_brand_new"),
									attributeIsShipRequired: t("product_attribute_ship_required"),
									attributeIsFreeShipping: t("product_attribute_free_shipping"),
									attributeAdditionalShipCost: t(
										"product_attribute_additional_shipping_cost",
									),
									attributeAvailableEndDate: t(
										"product_attribute_available_end_date",
									),
									attributeIsCreditTopUp: t(
										"product_attribute_is_credit_top_up",
									),
									attributeIsRecurring: t("product_attribute_is_recurring"),
									attributeInterval: t("product_attribute_interval"),
									attributeIntervalCount: t("product_attribute_interval_count"),
									attributeTrialPeriodDays: t(
										"product_attribute_trial_period_days",
									),
									attributeStripePriceId: t(
										"product_attribute_stripe_price_id",
									),
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
							})}
						</div>
					)}

					{layout === "inline" ? (
						<div className="flex flex-row flex-wrap justify-end gap-2 pt-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25 touch-manipulation"
							>
								{loading || form.formState.isSubmitting
									? t("saving")
									: isNew
										? t("create")
										: t("save")}
							</Button>
							{onInlineCancel ? (
								<Button
									variant="outline"
									type="button"
									disabled={loading}
									className="touch-manipulation"
									onClick={() => onInlineCancel()}
								>
									{t("cancel")}
								</Button>
							) : null}
						</div>
					) : (
						<DialogFooter className="flex flex-row justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25 touch-manipulation"
							>
								{loading || form.formState.isSubmitting
									? t("saving")
									: isNew
										? t("create")
										: t("save")}
							</Button>
							<Button
								variant="outline"
								type="button"
								disabled={loading}
								className="touch-manipulation"
								onClick={() => handleOpenChange(false)}
							>
								{t("cancel")}
							</Button>
						</DialogFooter>
					)}
				</form>
			</Form>
		</div>
	);

	if (layout === "inline") {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{headerTitle}</CardTitle>
					<CardDescription>{headerDescription}</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">{formBlock}</CardContent>
			</Card>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{!hideTrigger && (
				<DialogTrigger asChild>
					{trigger ?? (
						<Button variant="outline" className="touch-manipulation">
							<IconPlus className="mr-0 size-4" />
							{isNew ? t("create") : t("edit")}
						</Button>
					)}
				</DialogTrigger>
			)}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isNew ? t("create") : t("edit")}</DialogTitle>
					<DialogDescription>{t("product_mgmt_edit_descr")}</DialogDescription>
				</DialogHeader>
				{formBlock}
			</DialogContent>
		</Dialog>
	);
}
