"use client";

import { createStoreTablesAction } from "@/actions/storeAdmin/tables/create-store-tables";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { TableColumn } from "../table-column";

const formSchema = z.object({
	prefix: z.string().trim().optional(),
	numOfTables: z.coerce.number().int().min(1).max(100),
	capacity: z.coerce.number().int().min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkAddTablesDialogProps {
	onCreatedMany?: (tables: TableColumn[]) => void;
}

export function BulkAddTablesDialog({
	onCreatedMany,
}: BulkAddTablesDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues: {
			prefix: "",
			numOfTables: 1,
			capacity: 2,
		},
	});

	const onSubmit = async (values: FormValues) => {
		setLoading(true);
		try {
			const result = await createStoreTablesAction({
				storeId: String(params.storeId),
				prefix: values.prefix?.trim() ?? "",
				numOfTables: values.numOfTables,
				capacity: values.capacity,
			});

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
				return;
			}

			const createdTables = result?.data?.createdTables ?? [];
			onCreatedMany?.(createdTables);

			toastSuccess({
				title: t("storeTables") + t("Created"),
				description: "",
			});

			form.reset({
				prefix: "",
				numOfTables: 1,
				capacity: values.capacity,
			});
			setOpen(false);
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			form.reset({
				prefix: "",
				numOfTables: 1,
				capacity: form.getValues("capacity"),
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" onClick={() => setOpen(true)}>
					<IconPlus className="mr-0 size-4" />
					{t("StoreTable_Mgmt_AddButton")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("StoreTable_Mgmt_Add")}</DialogTitle>
					<DialogDescription>
						{t("StoreTable_Mgmt_Add_Descr")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="prefix"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("StoreTable_Mgmt_Prefix")}</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormDescription>
										{t("StoreTable_Mgmt_Prefix_Descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="numOfTables"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("StoreTable_NumToAdd")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
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
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex w-full items-center justify-end space-x-2 pt-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{t("Create")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
										type="button"
									>
										{t("Cancel")}
									</Button>
								</DialogClose>
							</DialogFooter>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
