"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FaqCategory } from "@prisma/client";
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
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { Faq } from "@/types";

interface editProps {
	initialData: Faq | null;
	category: FaqCategory;
	action: string;
}

export const FaqEdit = ({ initialData, category, action }: editProps) => {
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
						question: initialData.question,
						answer: initialData.answer,
						sortOrder: initialData.sortOrder,
						published: initialData.published ?? true,
					}
				: {
						id: "new",
						categoryId: category.id,
						question: "",
						answer: "",
						sortOrder: 1,
						published: true,
					},
		[initialData, category.id],
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
		<Card className="relative" aria-busy={isBusy}>
			<FormSubmitOverlay
				visible={isBusy}
				statusText={t("submitting") ?? "Submitting…"}
			/>
			<CardHeader>
				<Heading title={pageTitle} description="" />
				<Link href="#" className="text-sm" onClick={() => router.back()}>
					{category.name}
				</Link>
			</CardHeader>
			<CardContent className="space-y-2">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<FormField
							control={form.control}
							name="question"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>{t("f_a_q")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={isBusy}
											className="font-mono"
											placeholder={t("input_placeholder_1") + t("f_a_q")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="answer"
							render={({ field }) => (
								<FormItem className="p-3">
									<FormLabel>{t("f_a_q_answer")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={isBusy}
											className="font-mono"
											placeholder={t("input_placeholder_1") + t("f_a_q_answer")}
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
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("Published")}</FormLabel>
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

						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									const fieldLabels: Record<string, string> = {
										question: t("f_a_q") || "Question",
										answer: t("f_a_q_answer") || "Answer",
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

						<Button
							disabled={isBusy || !form.formState.isValid}
							className="disabled:opacity-25 touch-manipulation"
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
