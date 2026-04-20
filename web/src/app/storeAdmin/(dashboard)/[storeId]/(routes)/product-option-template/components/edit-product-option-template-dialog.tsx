"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createProductOptionTemplateAction } from "@/actions/storeAdmin/product-option-template/create-product-option-template";
import {
	type CreateProductOptionTemplateInput,
	createProductOptionTemplateSchema,
} from "@/actions/storeAdmin/product-option-template/create-product-option-template.validation";
import { updateProductOptionTemplateAction } from "@/actions/storeAdmin/product-option-template/update-product-option-template";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { ProductOptionTemplateColumn } from "../product-option-template-column";

interface EditProductOptionTemplateDialogProps {
	template?: ProductOptionTemplateColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (template: ProductOptionTemplateColumn) => void;
	onUpdated?: (template: ProductOptionTemplateColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

const buildSelectionsValue = (
	template?: ProductOptionTemplateColumn | null,
) => {
	if (!template?.selections?.length) {
		return "";
	}

	return template.selections
		.map((selection) => {
			const parts = [selection.name ?? "", String(selection.price ?? 0)];
			if (selection.isDefault) {
				parts.push("1");
			}
			return parts.join(":");
		})
		.join("\n");
};

export function EditProductOptionTemplateDialog({
	template,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditProductOptionTemplateDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(template) && !isNew;

	const defaultValues = useMemo<CreateProductOptionTemplateInput>(
		() => ({
			optionName: template?.optionName ?? "",
			isRequired: template?.isRequired ?? false,
			isMultiple: template?.isMultiple ?? false,
			minSelection: template?.minSelection ?? 0,
			maxSelection: template?.maxSelection ?? 1,
			allowQuantity: template?.allowQuantity ?? false,
			minQuantity: template?.minQuantity ?? 1,
			maxQuantity: template?.maxQuantity ?? 1,
			selections: buildSelectionsValue(template),
			sortOrder: template?.sortOrder ?? 1,
		}),
		[template],
	);

	const form = useForm<CreateProductOptionTemplateInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			createProductOptionTemplateSchema,
		) as Resolver<CreateProductOptionTemplateInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const isMultiple = form.watch("isMultiple");

	useEffect(() => {
		if (!isMultiple) {
			form.setValue("minSelection", 0);
			form.setValue("maxSelection", 1);
		}
	}, [form, isMultiple]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				form.reset(defaultValues);
			}
		},
		[defaultValues, form, setOpen],
	);

	const handleSuccess = useCallback(
		(result: ProductOptionTemplateColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: `${t("product_option_template")} ${t(
					isEditMode ? "updated" : "created",
				)}`,
				description: "",
			});

			form.reset(defaultValues);
			handleOpenChange(false);
		},
		[
			defaultValues,
			form,
			handleOpenChange,
			isEditMode,
			onCreated,
			onUpdated,
			t,
		],
	);

	const onSubmit = async (values: CreateProductOptionTemplateInput) => {
		try {
			setLoading(true);

			if (isEditMode && template) {
				const result = await updateProductOptionTemplateAction(
					String(params.storeId),
					{
						id: template.id,
						...values,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.template) {
					handleSuccess(result.data.template);
				}
			} else {
				const result = await createProductOptionTemplateAction(
					String(params.storeId),
					values,
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.template) {
					handleSuccess(result.data.template);
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

	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("product_option_template") + t("edit")
							: t("product_option_template") + t("create")}
					</DialogTitle>
					<DialogDescription>
						{t("product_option_mgmt_add_descr")}
					</DialogDescription>
				</DialogHeader>
				<div className="relative" aria-busy={isBusy}>
					<FormSubmitOverlay
						visible={isBusy}
						statusText={t("saving") ?? "Saving…"}
					/>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="optionName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_option_option_name")}</FormLabel>
										<FormControl>
											<Input disabled={isBusy} type="text" {...field} />
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_option_option_name_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isRequired"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("product_option_is_required")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_is_required_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={isBusy}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isMultiple"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("product_option_is_multiple")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_is_multiple_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={isBusy}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name="minSelection"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_option_min_selection")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={isBusy || !form.watch("isMultiple")}
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_min_selection_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="maxSelection"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_option_max_selection")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={isBusy || !form.watch("isMultiple")}
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_max_selection_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="allowQuantity"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>
												{t("product_option_allow_quantity")}
											</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_allow_quantity_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={isBusy}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name="minQuantity"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_option_min_quantity")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={isBusy || !form.watch("allowQuantity")}
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_min_quantity_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="maxQuantity"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("product_option_max_quantity")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={isBusy || !form.watch("allowQuantity")}
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("product_option_max_quantity_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="selections"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_option_selections")}</FormLabel>
										<FormControl>
											<Textarea
												className="font-mono"
												disabled={isBusy}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_option_selections_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="sortOrder"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("category_sort_order")}</FormLabel>
										<FormControl>
											<Input type="number" disabled={isBusy} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Validation Error Summary */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												optionName: t("Option_Name") || "Option Name",
												isRequired: t("Is_Required") || "Is Required",
												isMultiple: t("Is_Multiple") || "Is Multiple",
												minSelection: t("Min_Selection") || "Min Selection",
												maxSelection: t("Max_Selection") || "Max Selection",
												allowQuantity: t("Allow_Quantity") || "Allow Quantity",
												minQuantity: t("Min_Quantity") || "Min Quantity",
												maxQuantity: t("Max_Quantity") || "Max Quantity",
												selections: t("Selections") || "Selections",
												sortOrder: t("sort_order") || "Sort Order",
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

							<div className="flex w-full items-center justify-end space-x-2 pt-6">
								<Button
									type="submit"
									disabled={isBusy || !form.formState.isValid}
									className="touch-manipulation disabled:opacity-25"
								>
									{isEditMode ? t("save") : t("create")}
								</Button>
								<DialogFooter className="sm:justify-start">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleOpenChange(false)}
										disabled={isBusy}
										className="touch-manipulation"
									>
										{t("cancel")}
									</Button>
								</DialogFooter>
							</div>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
