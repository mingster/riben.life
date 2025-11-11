"use client";

import { createStoreTableAction } from "@/actions/storeAdmin/tables/create-store-table";
import { updateStoreTableAction } from "@/actions/storeAdmin/tables/update-store-table";
import { toastError, toastSuccess } from "@/components/toaster";
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

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import type { StoreTables } from "@prisma/client";
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

	//const [open, setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			tableName: initialData?.tableName ?? "",
			capacity: initialData?.capacity ?? 2,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			if (initialData) {
				const result = await updateStoreTableAction({
					storeId: String(params.storeId),
					id: initialData.id,
					tableName: data.tableName,
					capacity: data.capacity,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				toastSuccess({
					title: t("storeTables") + t("Updated"),
					description: "",
				});
			} else {
				const result = await createStoreTableAction({
					storeId: String(params.storeId),
					tableName: data.tableName,
					capacity: data.capacity,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				toastSuccess({
					title: t("storeTables") + t("Created"),
					description: "",
				});
			}
			router.push(`/storeAdmin/${params.storeId}/tables`);
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
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
											<Input
												type="number"
												value={field.value?.toString() ?? ""}
												onChange={(event) => field.onChange(event.target.value)}
											/>
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
