"use client";

import { createStoreCategoryAction } from "@/actions/storeAdmin/categories/create-category";
import { updateStoreCategoryAction } from "@/actions/storeAdmin/categories/update-category";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { CategoryColumn } from "../category-column";

const formSchema = z.object({
	name: z.string().min(1, { message: "name is required" }),
	sortOrder: z.coerce.number().int().min(1),
	isFeatured: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCategoryDialogProps {
	category?: CategoryColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (category: CategoryColumn) => void;
	onUpdated?: (category: CategoryColumn) => void;
	defaultSortOrder?: number;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditCategoryDialog({
	category,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	defaultSortOrder = 1,
	open,
	onOpenChange,
}: EditCategoryDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const isEditMode = Boolean(category) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			name: category?.name ?? "",
			sortOrder: category?.sortOrder ?? defaultSortOrder,
			isFeatured: category?.isFeatured ?? true,
		}),
		[category, defaultSortOrder],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues,
	});

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);

		if (!nextOpen) {
			resetForm();
		}
	};

	const handleSuccess = (updatedCategory: CategoryColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedCategory);
		} else {
			onCreated?.(updatedCategory);
		}

		toastSuccess({
			title: t("Category") + t(isEditMode ? "Updated" : "Created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormValues) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createStoreCategoryAction({
					storeId: String(params.storeId),
					name: values.name,
					sortOrder: values.sortOrder,
					isFeatured: values.isFeatured,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.category) {
					handleSuccess(result.data.category);
				}
			} else {
				const categoryId = category?.id;
				if (!categoryId) {
					toastError({
						title: t("Error"),
						description: "Category not found.",
					});
					return;
				}

				const result = await updateStoreCategoryAction({
					storeId: String(params.storeId),
					id: categoryId,
					name: values.name,
					sortOrder: values.sortOrder,
					isFeatured: values.isFeatured,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.category) {
					handleSuccess(result.data.category);
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? `${t("Edit")} ${t("Category")}`
							: `${t("Create")} ${t("Category")}`}
					</DialogTitle>
					<DialogDescription>
						{t("Category_Mgmt_descr") ?? ""}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Category_name")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
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
											value={field.value?.toString() ?? ""}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg p-3 shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("Category_isFeatured")}</FormLabel>
									</div>
									<FormControl>
										<Switch
											disabled={loading || form.formState.isSubmitting}
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter className="flex w-full justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{isEditMode ? t("Save") : t("Create")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("Cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
