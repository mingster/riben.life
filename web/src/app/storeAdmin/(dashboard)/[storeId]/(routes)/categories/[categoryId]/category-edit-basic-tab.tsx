"use client";

import { toastError, toastSuccess } from "@/components/Toaster";
import { Button } from "@/components/ui/button";

import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";

import { Switch } from "@/components/ui/switch";
import type { Category } from "@prisma/client";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
const formSchema = z.object({
	name: z.string().min(1, { message: "name is required" }),
	sortOrder: z.coerce.number().min(1),
	isFeatured: z.boolean().default(false).optional(),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData: Category | null;
}
export const CategoryEditBasicTab = ({ initialData }: editProps) => {
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
				isFeatured: true,
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
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/categories/${initialData.id}`,
					data,
				);
				toastSuccess({
					title: t("Category") + t("Updated"),
					description: "",
				});
			} else {
				// do create
				await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/categories`,
					data,
				);
				toastSuccess({
					title: t("Category") + t("Created"),
					description: "",
				});
			}
			router.push(`/storeAdmin/${params.storeId}/categories`);
			router.refresh();
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

	return (
		<>
			<Card>
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
										<FormLabel>{t("Category_name")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={
													t("input_placeholder1") + t("Category_name")
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
											<FormLabel>{t("Category_isFeatured")}</FormLabel>
											<FormDescription>
												{t("Category_isFeatured_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
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
										<FormLabel>{t("Category_sortOrder")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={
													t("input_placeholder1") + t("Category_sortOrder")
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
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									router.push(`/storeAdmin/${params.storeId}/categories`);
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
