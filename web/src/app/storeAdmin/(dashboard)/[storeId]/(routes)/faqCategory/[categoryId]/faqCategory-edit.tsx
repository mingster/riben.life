"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { updateFaqCategoryAction } from "@/actions/storeAdmin/faqCategory/update-faq-category";
import {
	type UpdateFaqCategoryInput,
	updateFaqCategorySchema,
} from "@/actions/storeAdmin/faqCategory/update-faq-category.validation";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { FaqCategory } from "@/types";

interface editProps {
	initialData: FaqCategory | null;
	action: string;
	defaultLocaleId: string;
}

export const FaqCategoryEdit = ({
	initialData,
	action,
	defaultLocaleId,
}: editProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<UpdateFaqCategoryInput>(
		() =>
			initialData
				? {
						id: initialData.id,
						localeId: initialData.localeId,
						name: initialData.name,
						sortOrder: initialData.sortOrder,
					}
				: {
						id: "new",
						localeId: defaultLocaleId,
						name: "",
						sortOrder: 1,
					},
		[initialData, defaultLocaleId],
	);

	const form = useForm<UpdateFaqCategoryInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateFaqCategorySchema,
		) as Resolver<UpdateFaqCategoryInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: UpdateFaqCategoryInput) => {
		setLoading(true);
		try {
			const result = await updateFaqCategoryAction(
				String(params.storeId),
				data,
			);
			if (!result) {
				toastError({ description: "An error occurred" });
				return;
			}
			if (result.serverError) {
				toastError({ description: result.serverError });
				return;
			}

			toastSuccess({
				title: initialData
					? `${t("faq_category")} ${t("saved")}`
					: `${t("faq_category")} ${t("created")}`,
				description: "",
			});
			router.refresh();
			router.push(`/storeAdmin/${params.storeId}/faqCategory`);
		} catch (err: unknown) {
			toastError({
				title: "Something went wrong.",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	const pageTitle = t(action) + t("faq_category");
	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Card className="relative" aria-busy={isBusy}>
			<FormSubmitOverlay
				visible={isBusy}
				statusText={t("submitting") ?? "Submitting…"}
			/>
			<CardHeader> {pageTitle} </CardHeader>
			<CardContent className="space-y-2">
				<Form {...form}>
					<form
						acceptCharset="UTF-8"
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<FormField
							control={form.control}
							name="localeId"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>
										{t("Locale")} <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Select
											disabled={isBusy}
											onValueChange={field.onChange}
											value={field.value}
										>
											<SelectTrigger className="touch-manipulation">
												<SelectValue placeholder="Select a default locale" />
											</SelectTrigger>
											<SelectContent>
												<LocaleSelectItems />
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>
										{t("faq_category_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={isBusy}
											className="font-mono touch-manipulation"
											placeholder={
												t("input_placeholder_1") + t("faq_category_name")
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
							name="sortOrder"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>
										{t("faq_category_sort_order")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={isBusy}
											className="font-mono touch-manipulation"
											placeholder={
												t("input_placeholder_1") + t("faq_category_sort_order")
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
										name: t("faq_category_name") || "FAQ Category Name",
										localeId: t("Locale") || "Locale",
										sortOrder: t("faq_category_sort_order") || "Sort Order",
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
							disabled={isBusy}
							type="button"
							variant="outline"
							onClick={() => {
								form.clearErrors();
								router.push(`/storeAdmin/${params.storeId}/faqCategory`);
							}}
							className="ml-5 touch-manipulation"
						>
							{t("cancel")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
