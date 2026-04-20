"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import {
	type CreateProductOptionTemplateInput,
	createProductOptionTemplateSchema,
} from "@/actions/storeAdmin/product-option-template/create-product-option-template.validation";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import {
	mapPrismaProductOptionToRow,
	type ProductOptionRow,
} from "@/lib/store-admin/map-product-column";
import { useI18n } from "@/providers/i18n-provider";

function buildSelectionsValue(option?: ProductOptionRow | null): string {
	if (!option?.selections?.length) {
		return "";
	}
	return option.selections
		.map((selection) => {
			const parts = [selection.name ?? "", String(selection.price ?? 0)];
			if (selection.isDefault) {
				parts.push("1");
			}
			if (selection.imageUrl) {
				parts.push(selection.imageUrl);
			}
			return parts.join(":");
		})
		.join("\n");
}

interface EditProductOptionDialogProps {
	storeId: string;
	productId: string;
	option?: ProductOptionRow | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onSaved: (row: ProductOptionRow) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditProductOptionDialog({
	storeId,
	productId,
	option,
	isNew = false,
	trigger,
	onSaved,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditProductOptionDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(option) && !isNew;

	const defaultValues = useMemo<CreateProductOptionTemplateInput>(
		() => ({
			optionName: option?.optionName ?? "",
			isRequired: option?.isRequired ?? false,
			isMultiple: option?.isMultiple ?? false,
			minSelection: option?.minSelection ?? 0,
			maxSelection: option?.maxSelection ?? 1,
			allowQuantity: option?.allowQuantity ?? false,
			minQuantity: option?.minQuantity ?? 1,
			maxQuantity: option?.maxQuantity ?? 1,
			selections: buildSelectionsValue(option),
			sortOrder: option?.sortOrder ?? 1,
		}),
		[option],
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

	const onSubmit = async (values: CreateProductOptionTemplateInput) => {
		setLoading(true);
		try {
			const url = isEditMode
				? `/api/storeAdmin/${storeId}/product/${productId}/options/${option?.id}`
				: `/api/storeAdmin/${storeId}/product/${productId}/options`;
			const res = await fetch(url, {
				method: isEditMode ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});

			if (!res.ok) {
				const text = await res.text();
				toastError({
					title: t("error_title"),
					description: text || res.statusText,
				});
				return;
			}

			const raw = (await res.json()) as Record<string, unknown>;
			const row = mapPrismaProductOptionToRow(
				raw as unknown as Parameters<typeof mapPrismaProductOptionToRow>[0],
			);
			onSaved(row);
			toastSuccess({
				title: isEditMode ? t("product_updated") : t("product_created"),
				description: t("product_option_saved_descr"),
			});
			handleOpenChange(false);
		} catch (err: unknown) {
			toastError({
				title: t("error_title"),
				description: err instanceof Error ? err.message : String(err),
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
							? `${t("product_tab_options")} — ${t("edit")}`
							: `${t("product_tab_options")} — ${t("create")}`}
					</DialogTitle>
					<DialogDescription>
						{t("product_mgmt_options_descr")}
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
										<FormLabel>
											{t("product_option_option_name")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={isBusy}
												type="text"
												placeholder={t(
													"product_option_option_name_placeholder",
												)}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												{...field}
											/>
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
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
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
										<FormLabel>
											{t("product_option_selections")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Textarea
												className="font-mono min-h-[100px] text-base sm:text-sm touch-manipulation"
												disabled={isBusy}
												placeholder={t("product_option_selections_placeholder")}
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
										<FormLabel>
											{t("category_sort_order")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={isBusy}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex w-full flex-col-reverse items-stretch justify-end gap-2 pt-6 sm:flex-row sm:items-center sm:space-x-2">
								<Button
									type="button"
									variant="outline"
									className="touch-manipulation"
									onClick={() => handleOpenChange(false)}
									disabled={isBusy}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={isBusy || !form.formState.isValid}
									className="touch-manipulation disabled:opacity-25"
								>
									{isEditMode ? t("save") : t("create")}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function AddProductOptionTrigger({
	storeId,
	productId,
	onSaved,
}: {
	storeId: string;
	productId: string;
	onSaved: (row: ProductOptionRow) => void;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<EditProductOptionDialog
			storeId={storeId}
			productId={productId}
			isNew
			onSaved={onSaved}
			trigger={
				<Button type="button" variant="outline" className="touch-manipulation">
					<IconPlus className="mr-2 size-4" />
					{t("product_option_add")}
				</Button>
			}
		/>
	);
}
