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
import { Switch } from "@/components/ui/switch";
import { adminCrudUseFormProps } from "@/lib/admin/form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { FaqCategory, FaqCategoryLocale, Locale } from "@/types";

interface editProps {
	initialData: FaqCategory | null;
	action: string;
	defaultLocaleId: string;
	allLocales: Locale[];
}

export const FaqCategoryEdit = ({
	initialData,
	action,
	defaultLocaleId,
	allLocales,
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
						sortOrder: initialData.sortOrder,
						published: initialData.published,
						locales: allLocales.reduce(
							(acc, l) => ({
								...acc,
								[l.id]:
									initialData.locales.find(
										(loc: FaqCategoryLocale) => loc.localeId === l.id,
									)?.name ?? "",
							}),
							{},
						),
					}
				: {
						id: "new",
						sortOrder: 1,
						published: false,
						locales: allLocales.reduce(
							(acc, l) => ({ ...acc, [l.id]: "" }),
							{},
						),
					},
		[initialData, allLocales],
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
		<Card className="relative max-w-4xl mx-auto" aria-busy={isBusy}>
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
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{allLocales.map((locale) => (
								<FormField
									key={locale.id}
									control={form.control}
									name={`locales.${locale.id}`}
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>
												{t("faq_category_name")} ({locale.name})
											</FormLabel>
											<FormControl>
												<Input
													disabled={isBusy}
													className="touch-manipulation"
													placeholder={`${t("input_placeholder_1")}${t("faq_category_name")} (${locale.name})`}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							))}
						</div>

						<div className="grid grid-cols-2 gap-4 border-t pt-4">
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
													t("input_placeholder_1") +
													t("faq_category_sort_order")
												}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="published"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-lg border p-3 mt-4 mx-3">
										<FormLabel>{t("faq_published")}</FormLabel>
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
						</div>

						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									if (field === "locales") {
										return Object.entries(
											error as Record<string, { message: string }>,
										).map(([localeId, localeError]) => {
											const locale = allLocales.find(
												(l: Locale) => l.id === localeId,
											);
											return (
												<div
													key={`locale-${localeId}`}
													className="text-sm text-destructive flex items-start gap-2"
												>
													<span className="font-medium">
														{t("faq_category_name")} ({locale?.name || localeId}
														):
													</span>
													<span>{localeError.message}</span>
												</div>
											);
										});
									}
									const fieldLabels: Record<string, string> = {
										sortOrder: t("faq_category_sort_order") || "Sort Order",
										published: t("Published") || "Published",
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

						<div className="pt-4 flex items-center">
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
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
