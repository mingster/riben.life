"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Faq } from "@/types";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Textarea } from "@/components/ui/textarea";
import type { FaqCategory } from "@prisma/client";
import Link from "next/link";
import * as z from "zod";
const formSchema = z.object({
	question: z.string().min(1, { message: "question is required" }),
	answer: z.string().min(1, { message: "answer is required" }),
	sortOrder: z.number().min(1),
});

type formValues = z.infer<typeof formSchema>;

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
	//const [open, setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {};

	//console.log(`product basic: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: formValues) => {
		//try {
		setLoading(true);
		if (initialData) {
			// do edit
			const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${category.id}/faq/${initialData.id}`;

			await axios.patch(url, data);
			toastSuccess({
				title: t("FAQ") + t("saved"),
				description: "",
			});
			router.refresh();
		} else {
			// do create
			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${category.id}/faq`,
				data,
			);
			toastSuccess({
				title: t("FAQ") + t("created"),
				description: "",
			});

			router.refresh();
			router.push(
				`/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
			);
		}
		setLoading(false);

		/*

    } catch (err: unknown) {
      const error = err as AxiosError;
      toastError({
        title: "Something went wrong.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }

      */
	};

	const pageTitle = t(action) + t("FAQ");

	return (
		<>
			<Card>
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
										<FormLabel>{t("FAQ")}</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("input_placeholder1") + t("FAQ")}
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
										<FormLabel>{t("FAQ_Answer")}</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("input_placeholder1") + t("FAQ_Answer")}
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
										<FormLabel>{t("sortOrder")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("input_placeholder1") + t("sortOrder")}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Validation Error Summary */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												question: t("Question") || "Question",
												answer: t("Answer") || "Answer",
												sortOrder: t("Sort_Order") || "Sort Order",
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

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									router.push(
										`/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
									);
								}}
								className="ml-5"
							>
								{t("cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
