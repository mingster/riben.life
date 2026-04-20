"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Category, ProductCategories } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createStoreCategoryAction } from "@/actions/storeAdmin/categories/create-category";
import { updateStoreCategoryAction } from "@/actions/storeAdmin/categories/update-category";
import {
	type UpdateCategoryFormInput,
	updateCategoryFormSchema,
} from "@/actions/storeAdmin/categories/update-category.validation";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";

interface editProps {
	initialData:
		| (Category & {
				ProductCategories: ProductCategories[] | [];
		  })
		| null;
}

export const CategoryEditBasicTab = ({ initialData }: editProps) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<UpdateCategoryFormInput>(
		() =>
			initialData
				? {
						name: initialData.name,
						sortOrder: initialData.sortOrder,
						isFeatured: initialData.isFeatured,
					}
				: {
						name: "",
						sortOrder: 1,
						isFeatured: true,
					},
		[initialData],
	);

	const form = useForm<UpdateCategoryFormInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateCategoryFormSchema,
		) as Resolver<UpdateCategoryFormInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (values: UpdateCategoryFormInput) => {
		setLoading(true);
		try {
			if (initialData) {
				const result = await updateStoreCategoryAction(String(params.storeId), {
					id: initialData.id,
					name: values.name,
					sortOrder: values.sortOrder,
					isFeatured: values.isFeatured,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				toastSuccess({
					title: t("category") + t("updated"),
					description: "",
				});
			} else {
				const result = await createStoreCategoryAction(String(params.storeId), {
					name: values.name,
					sortOrder: values.sortOrder,
					isFeatured: values.isFeatured,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				toastSuccess({
					title: t("category") + t("created"),
					description: "",
				});
			}

			router.push(`/storeAdmin/${params.storeId}/categories`);
			router.refresh();
		} catch (err: unknown) {
			toastError({
				title: "Something went wrong.",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Card className="relative" aria-busy={isBusy}>
			<FormSubmitOverlay
				visible={isBusy}
				statusText={t("submitting") ?? "Submitting…"}
			/>
			<CardTitle> </CardTitle>
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
								<FormItem className="p-3">
									<FormLabel>
										{t("category_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={isBusy}
											className="font-mono h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
											placeholder={
												t("input_placeholder_1") + t("category_name")
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
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("category_is_featured")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("category_is_featured_descr")}
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
							name="sortOrder"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>
										{t("category_sort_order")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={isBusy}
											className="font-mono h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
											placeholder={
												t("input_placeholder_1") + t("category_sort_order")
											}
											type="number"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									const fieldLabels: Record<string, string> = {
										name: t("category_name") || "Category Name",
										sortOrder: t("category_sort_order") || "Sort Order",
										isFeatured: t("category_is_featured") || "Featured",
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

						<Button
							disabled={isBusy || !form.formState.isValid}
							className="touch-manipulation disabled:opacity-25"
							type="submit"
						>
							{t("save")}
						</Button>

						<Button
							type="button"
							variant="outline"
							onClick={() => {
								form.clearErrors();
								router.push(`/storeAdmin/${params.storeId}/categories`);
							}}
							className="ml-5 touch-manipulation"
							disabled={isBusy}
						>
							{t("cancel")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
