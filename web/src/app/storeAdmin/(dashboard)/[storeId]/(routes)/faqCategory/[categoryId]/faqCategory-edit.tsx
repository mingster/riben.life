"use client";

import { toastError, toastSuccess } from "@/components/Toaster";
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
import { zodResolver } from "@hookform/resolvers/zod";

import type { FaqCategory } from "@/types";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import * as z from "zod";
const formSchema = z.object({
	//storeId: z.string().optional().default(""),
	name: z.string().min(1, { message: "name is required" }),
	sortOrder: z.number().min(1),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData: FaqCategory | null;
	action: string;
}
export const FaqCategoryEdit = ({ initialData, action }: editProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	//const [open, setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {
				name: "",
				sortOrder: 0,
			};

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
		try {
			setLoading(true);
			//console.log(`onSubmit: ${JSON.stringify(data)}`);
			if (initialData) {
				// do edit
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${initialData.id}`,
					data,
				);
				toastSuccess({
					title: "faq category saved.",
					description: "",
				});
			} else {
				// do create
				await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory`,
					data,
				);
				toastSuccess({
					title: "faq category created.",
					description: "",
				});
			}
			router.refresh();
			router.push(`/storeAdmin/${params.storeId}/faqCategory`);
		} catch (err: unknown) {
			const error = err as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: error.message,
			});
		} finally {
			setLoading(false);
		}
	};

	const pageTitle = t(action) + t("FaqCategory");

	return (
		<>
			<Card>
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
								name="name"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormLabel>{t("FaqCategory_name")}</FormLabel>
										<FormControl>
											<Input
												type="text"
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={
													t("input_placeholder1") + t("FaqCategory_name")
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
										<FormLabel>{t("FaqCategory_sortOrder")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={
													t("input_placeholder1") + t("FaqCategory_sortOrder")
												}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("Save")}
							</Button>

							<Button
								disabled={loading || form.formState.isSubmitting}
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									router.push(`/storeAdmin/${params.storeId}/faqCategory`);
								}}
								className="ml-5"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
