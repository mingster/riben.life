"use client";

import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createStoreCategoriesAction } from "@/actions/storeAdmin/categories/create-category-bulk";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";

import type { CategoryColumn } from "../category-column";

const formSchema = z.object({
	names: z.string().min(1, { message: "names is required" }),
	isFeatured: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkAddCategoriesDialogProps {
	onCreatedMany?: (categories: CategoryColumn[]) => void;
}

export function BulkAddCategoriesDialog({
	onCreatedMany,
}: BulkAddCategoriesDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues: {
			names: "",
			isFeatured: true,
		},
	});

	const resetForm = () => {
		form.reset({
			names: "",
			isFeatured: true,
		});
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	const onSubmit = async (values: FormValues) => {
		const parsedNames = values.names
			.split(/\r?\n/)
			.map((name) => name.trim())
			.filter(Boolean);

		if (!parsedNames.length) {
			form.setError("names", {
				type: "manual",
				message: "At least one category name is required.",
			});
			return;
		}

		setLoading(true);
		try {
			const result = await createStoreCategoriesAction(String(params.storeId), {
				names: parsedNames,
				isFeatured: values.isFeatured,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			const createdCategories = result?.data?.createdCategories ?? [];
			if (createdCategories.length > 0) {
				onCreatedMany?.(createdCategories);
			}

			toastSuccess({
				title: t("Category") + t("created"),
				description: "",
			});

			resetForm();
			setOpen(false);
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" onClick={() => setOpen(true)}>
					<IconPlus className="mr-0 size-4" />
					{t("Category_mgmt_add_button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("Category_mgmt_add")}</DialogTitle>
					<DialogDescription>{t("Category_mgmt_add_descr")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="names"
							render={({ field, fieldState }) => (
								<FormItem>
									<FormLabel>{t("Category_names")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("Category_names_descr")}
									</FormDescription>
									<FormMessage>{fieldState.error?.message}</FormMessage>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg p-3 shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("Category_isFeatured")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("Category_isFeatured_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											disabled={loading || form.formState.isSubmitting}
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<div className="flex w-full items-center justify-end space-x-2 pt-2">
							<Button
								type="submit"
								disabled={
									loading ||
									form.formState.isSubmitting ||
									!form.formState.isValid
								}
							>
								{t("create")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
									>
										{t("cancel")}
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
