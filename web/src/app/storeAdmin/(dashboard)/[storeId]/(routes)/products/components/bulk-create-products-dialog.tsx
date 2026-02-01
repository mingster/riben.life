"use client";

import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createStoreProductsBulkAction } from "@/actions/storeAdmin/product/create-products-bulk";
import type { ProductColumn } from "../product-column";
import { ProductStatusCombobox } from "../[productId]/product-status-combobox";

const formSchema = z.object({
	rawEntries: z.string().min(1, { message: "Product data is required" }),
	status: z.number(),
});

interface BulkCreateProductsDialogProps {
	onCreated?: (products: ProductColumn[]) => void;
	trigger?: React.ReactNode;
}

export function BulkCreateProductsDialog({
	onCreated,
	trigger,
}: BulkCreateProductsDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			rawEntries: "",
			status: Number(ProductStatus.Published),
		},
	});

	const handleOpenChange = (value: boolean) => {
		setOpen(value);
		if (!value) {
			form.reset();
		}
	};

	const parseEntries = (rawEntries: string) => {
		return rawEntries
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => {
				const [name, price, description, categoryName, optionTemplateName] =
					line.split("|").map((segment) => segment?.trim() ?? "");

				return {
					name,
					price:
						price && !Number.isNaN(Number(price)) ? Number(price) : undefined,
					description: description || undefined,
					categoryName: categoryName || undefined,
					optionTemplateName: optionTemplateName || undefined,
				};
			})
			.filter((entry) => entry.name);
	};

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);
		try {
			const entries = parseEntries(data.rawEntries);

			if (entries.length === 0) {
				form.setError("rawEntries", {
					type: "manual",
					message: `${t("product_names")} is required`,
				});
				setLoading(false);
				return;
			}

			const result = await createStoreProductsBulkAction(
				String(params.storeId),
				{
					status: data.status,
					entries,
				},
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data?.products) {
				onCreated?.(result.data.products);
				toastSuccess({
					title: t("product_created"),
					description: "",
				});
				form.reset();
				setOpen(false);
			}
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
				{trigger ?? (
					<Button variant="outline">
						<IconPlus className="mr-0 size-4" />
						{t("product_mgmt_add_button")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("product_mgmt_add")}</DialogTitle>
					<DialogDescription>{t("product_mgmt_add_descr")}</DialogDescription>
				</DialogHeader>
				<div className="relative">
					{(loading || form.formState.isSubmitting) && (
						<div
							className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
							aria-hidden="true"
						>
							<div className="flex flex-col items-center gap-3">
								<Loader />
								<span className="text-sm font-medium text-muted-foreground">
									{t("saving") || "Saving..."}
								</span>
							</div>
						</div>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="rawEntries"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("product_names")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Textarea
												placeholder={t("product_names_descr")}
												disabled={loading}
												className="min-h-[160px]"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{`${t("product_names_descr")} (name|price|description|category|option)`}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("product_status")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<ProductStatusCombobox
												disabled={loading}
												defaultValue={
													field.value ?? Number(ProductStatus.Published)
												}
												onChange={(value) => field.onChange(Number(value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Validation Error Summary */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												rawEntries: t("Product_Data") || "Product Data",
												status: t("Status") || "Status",
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

							<DialogFooter className="flex flex-row justify-end space-x-2">
								<Button
									variant="outline"
									type="button"
									disabled={loading}
									onClick={() => handleOpenChange(false)}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{t("create")}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
