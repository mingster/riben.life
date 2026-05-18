"use client";

import { zodResolver } from "@hookform/resolvers/zod";
type CategoryRef = {
	id: string;
	locales: { name: string; localeId: string }[];
};
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { updateFaqAction } from "@/actions/storeAdmin/faq/update-faq";
import {
	type UpdateFaqInput,
	updateFaqSchema,
} from "@/actions/storeAdmin/faq/update-faq.validation";
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
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminCrudUseFormProps } from "@/lib/admin/form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { Faq, FaqLocale, Locale } from "@/types";
import dynamic from "next/dynamic";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

interface editProps {
	initialData: Faq | null;
	category: CategoryRef;
	action: string;
	allLocales: Locale[];
	allCategories: CategoryRef[];
}

export const FaqEdit = ({
	initialData,
	category,
	action,
	allLocales,
	allCategories,
}: editProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<UpdateFaqInput>(
		() =>
			initialData
				? {
						id: initialData.id,
						categoryId: category.id,
						sortOrder: initialData.sortOrder,
						published: initialData.published ?? true,
						locales: allLocales.reduce(
							(acc, l) => ({
								...acc,
								[l.id]: {
									question:
										initialData.locales.find(
											(loc: FaqLocale) => loc.localeId === l.id,
										)?.question ?? "",
									answer:
										initialData.locales.find(
											(loc: FaqLocale) => loc.localeId === l.id,
										)?.answer ?? "",
								},
							}),
							{},
						),
					}
				: {
						id: "new",
						categoryId: category.id,
						sortOrder: 1,
						published: true,
						locales: allLocales.reduce(
							(acc, l) => ({
								...acc,
								[l.id]: { question: "", answer: "" },
							}),
							{},
						),
					},
		[initialData, category.id, allLocales],
	);

	const form = useForm<UpdateFaqInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(updateFaqSchema) as Resolver<UpdateFaqInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: UpdateFaqInput) => {
		setLoading(true);
		try {
			const result = await updateFaqAction(String(params.storeId), data);
			if (!result) {
				toastError({ description: "An error occurred" });
				return;
			}
			if (result.serverError) {
				toastError({ description: result.serverError });
				return;
			}

			if (data.id === "new") {
				toastSuccess({
					title: t("f_a_q") + t("created"),
					description: "",
				});
				router.refresh();
				router.push(
					`/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
				);
			} else if (data.categoryId !== category.id) {
				toastSuccess({ description: t("faq_moved") });
				router.push(
					`/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
				);
			} else {
				toastSuccess({
					title: t("f_a_q") + t("saved"),
					description: "",
				});
				router.refresh();
			}
		} catch (err: unknown) {
			toastError({
				title: "Something went wrong.",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	const pageTitle = t(action) + t("f_a_q");
	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Card className="relative max-w-4xl mx-auto" aria-busy={isBusy}>
			<FormSubmitOverlay
				visible={isBusy}
				statusText={t("submitting") ?? "Submitting…"}
			/>
			<CardHeader>
				<Heading title={pageTitle} description="" />
				<Link href="#" className="text-sm" onClick={() => router.back()}>
					{category.locales[0]?.name ?? "—"}
				</Link>
			</CardHeader>
			<CardContent className="space-y-4">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-6"
					>
						<div className="space-y-6">
							{allLocales.map((locale) => (
								<div
									key={locale.id}
									className="rounded-lg border p-4 space-y-4"
								>
									<div className="flex items-center gap-2 border-b pb-2">
										<Badge variant="outline">{locale.id.toUpperCase()}</Badge>
										<span className="text-sm font-semibold">{locale.name}</span>
									</div>

									<FormField
										control={form.control}
										name={`locales.${locale.id}.question`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("faq_question")}</FormLabel>
												<FormControl>
													<Input
														disabled={isBusy}
														placeholder={t("faq_question")}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name={`locales.${locale.id}.answer`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("faq_answer")}</FormLabel>
												<FormControl>
													<EditorComp
														markdown={field.value}
														onPChange={field.onChange}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							))}
						</div>

						{initialData && allCategories.length > 0 && (
							<FormField
								control={form.control}
								name="categoryId"
								render={({ field }) => (
									<FormItem className="pt-4 border-t">
										<FormLabel>{t("faq_move_to_category")}</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{allCategories.map((cat) => {
													const name =
														cat.locales.find((l) => l.localeId === lng)?.name ??
														cat.locales[0]?.name ??
														cat.id;
													return (
														<SelectItem key={cat.id} value={cat.id}>
															{name}
														</SelectItem>
													);
												})}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<div className="grid grid-cols-2 gap-4 pt-4 border-t">
							<FormField
								control={form.control}
								name="sortOrder"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("sort_order")}</FormLabel>
										<FormControl>
											<Input
												disabled={isBusy}
												className="font-mono"
												placeholder={t("input_placeholder_1") + t("sort_order")}
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
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4">
										<FormLabel>{t("Published")}</FormLabel>
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
														{t("faq_question")} ({locale?.name || localeId}):
													</span>
													<span>{localeError.message}</span>
												</div>
											);
										});
									}
									const fieldLabels: Record<string, string> = {
										sortOrder: t("sort_order") || "Sort Order",
										published: t("Published") || "Published",
										categoryId: t("category") || "Category",
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

						<div className="flex gap-2">
							<Button
								disabled={isBusy || !form.formState.isValid}
								className="disabled:opacity-25 touch-manipulation flex-1"
								type="submit"
							>
								{t("save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.clearErrors();
									router.push(
										`/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
									);
								}}
								className="touch-manipulation flex-1"
								disabled={isBusy}
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
