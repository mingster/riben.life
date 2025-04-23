"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import type { StoreTables } from "@prisma/client";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
const formSchema = z.object({
	tableName: z.string().min(1, { message: "name is required" }),
	capacity: z.coerce.number().min(1),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData: StoreTables | null;
	action: string;
}
export const EditStoreTable = ({ initialData, action }: editProps) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const { toast } = useToast();
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
		try {
			setLoading(true);
			//console.log(`onSubmit: ${JSON.stringify(data)}`);
			if (initialData) {
				// do edit
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/tables/${initialData.id}`,
					data,
				);
				toast({
					title: t("storeTables") + t("Updated"),
					description: "",
					variant: "success",
				});
			} else {
				// do create
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/tables`,
					data,
				);
				toast({
					title: t("storeTables") + t("Created"),
					description: "",
					variant: "success",
				});
			}
			router.push(`/storeAdmin/${params.storeId}/tables`);
			router.refresh();
		} catch (err: unknown) {
			const error = err as AxiosError;
			toast({
				title: "Something went wrong.",
				description: error.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const pageTitle = t(action) + t("storeTables");

	return (
		<>
			<Heading title={pageTitle} description="" />

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
								name="tableName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreTable_Name")}</FormLabel>
										<FormControl>
											<Input type="text" {...field} />
										</FormControl>
										<FormMessage />
										<FormDescription>
											{t("StoreTable_Name_Descr")}
										</FormDescription>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="capacity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreTable_Seats")}</FormLabel>
										<FormControl>
											<Input type="number" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex w-full items-center justify-end space-x-2 pt-6">
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
										router.push(`/storeAdmin/${params.storeId}/tables`);
									}}
									className="ml-5"
								>
									{t("Cancel")}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
