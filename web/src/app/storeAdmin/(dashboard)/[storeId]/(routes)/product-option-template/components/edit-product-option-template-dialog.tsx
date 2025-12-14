"use client";

import { createProductOptionTemplateAction } from "@/actions/storeAdmin/product-option-template/create-product-option-template";
import { updateProductOptionTemplateAction } from "@/actions/storeAdmin/product-option-template/update-product-option-template";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ProductOptionTemplateColumn } from "../product-option-template-column";

const formSchema = z.object({
	optionName: z.string().min(1, { message: "option name is required" }),
	isRequired: z.boolean().default(false),
	isMultiple: z.boolean().default(false),
	minSelection: z.coerce.number().int().min(0),
	maxSelection: z.coerce.number().int().min(1),
	allowQuantity: z.boolean().default(false),
	minQuantity: z.coerce.number().int().min(1),
	maxQuantity: z.coerce.number().int().min(1),
	selections: z.string().min(1, { message: "selections is required" }),
	sortOrder: z.coerce.number().int().min(1),
});

type FormValues = z.infer<typeof formSchema>;

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

	const defaultValues = useMemo<FormValues>(
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

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues,
		mode: "onChange",
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
				title: `${t("ProductOption_template")} ${t(
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

	const onSubmit = async (values: FormValues) => {
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

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("ProductOption_template") + t("edit")
							: t("ProductOption_template") + t("create")}
					</DialogTitle>
					<DialogDescription>
						{t("ProductOption_mgmt_add_descr")}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="optionName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("ProductOption_optionName")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											type="text"
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("ProductOption_optionName_descr")}
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
										<FormLabel>{t("ProductOption_isRequired")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_isRequired_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
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
										<FormLabel>{t("ProductOption_isMultiple")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_isMultiple_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
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
										<FormLabel>{t("ProductOption_minSelection")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={
													loading ||
													form.formState.isSubmitting ||
													!form.watch("isMultiple")
												}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_minSelection_descr")}
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
										<FormLabel>{t("ProductOption_maxSelection")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={
													loading ||
													form.formState.isSubmitting ||
													!form.watch("isMultiple")
												}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_maxSelection_descr")}
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
										<FormLabel>{t("ProductOption_allowQuantity")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_allowQuantity_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
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
										<FormLabel>{t("ProductOption_minQuantity")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={
													loading ||
													form.formState.isSubmitting ||
													!form.watch("allowQuantity")
												}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_minQuantity_descr")}
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
										<FormLabel>{t("ProductOption_maxQuantity")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={
													loading ||
													form.formState.isSubmitting ||
													!form.watch("allowQuantity")
												}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_maxQuantity_descr")}
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
									<FormLabel>{t("ProductOption_selections")}</FormLabel>
									<FormControl>
										<Textarea
											className="font-mono"
											disabled={loading || form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("ProductOption_selections_descr")}
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
									<FormLabel>{t("Category_sortOrder")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex w-full items-center justify-end space-x-2 pt-6">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{isEditMode ? t("save") : t("create")}
							</Button>
							<DialogFooter className="sm:justify-start">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
							</DialogFooter>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
