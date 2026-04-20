"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createStoreProductsBulkAction } from "@/actions/storeAdmin/product/create-products-bulk";
import {
	type CreateStoreProductsBulkFormInput,
	createStoreProductsBulkFormSchema,
	createStoreProductsBulkSchema,
} from "@/actions/storeAdmin/product/create-products-bulk.validation";
import { useTranslation } from "@/app/i18n/client";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import {
	getProductStatusTranslationKey,
	ProductStatus,
	ProductStatuses,
} from "@/types/enum";

import type { ProductColumn } from "../product-column";

type FormValues = CreateStoreProductsBulkFormInput;

export type ParsedBulkProductLine = {
	name: string;
	description?: string;
	price: number;
	categoryName?: string;
	optionTemplateName?: string;
};

/** Riben-style lines: `name|price|description|category name|option template name` */
export function parseProductBulkLines(text: string): ParsedBulkProductLine[] {
	const out: ParsedBulkProductLine[] = [];
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}
		const parts = line.split("|").map((p) => p.trim());
		const name = parts[0] ?? "";
		const priceRaw = parts[1] ?? "";
		if (!name || priceRaw === "") {
			continue;
		}
		const price = Number(priceRaw);
		if (Number.isNaN(price)) {
			continue;
		}
		const description = parts[2]?.length ? parts[2] : undefined;
		const categoryName = parts[3]?.length ? parts[3] : undefined;
		const optionTemplateName = parts[4]?.length ? parts[4] : undefined;
		out.push({
			name,
			price,
			description,
			categoryName,
			optionTemplateName,
		});
	}
	return out;
}

interface BulkAddProductsDialogProps {
	onCreatedMany?: (products: ProductColumn[]) => void;
}

export function BulkAddProductsDialog({
	onCreatedMany,
}: BulkAddProductsDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<FormValues>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			createStoreProductsBulkFormSchema,
		) as Resolver<FormValues>,
		defaultValues: {
			lines: "",
			status: ProductStatus.Published,
		},
	});

	const resetForm = useCallback(() => {
		form.reset({
			lines: "",
			status: ProductStatus.Published,
		});
	}, [form]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				resetForm();
			}
		},
		[resetForm],
	);

	const onSubmit = async (values: FormValues) => {
		const entries = parseProductBulkLines(values.lines);
		if (entries.length === 0) {
			form.setError("lines", {
				type: "manual",
				message: t("product_mgmt_bulk_lines_invalid"),
			});
			return;
		}

		const parsed = createStoreProductsBulkSchema.safeParse({
			status: values.status,
			entries,
		});
		if (!parsed.success) {
			const msg = parsed.error.issues.map((i) => i.message).join("; ");
			form.setError("lines", { type: "manual", message: msg });
			return;
		}

		setLoading(true);
		try {
			const result = await createStoreProductsBulkAction(
				String(params.storeId),
				{
					status: parsed.data.status,
					entries: parsed.data.entries,
				},
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			const created = result?.data?.products ?? [];
			if (created.length > 0) {
				onCreatedMany?.(created);
			}

			toastSuccess({
				title: t("product_mgmt_add"),
				description: t("product_mgmt_bulk_created_count", {
					count: created.length,
				}),
			});

			resetForm();
			setOpen(false);
		} catch (err: unknown) {
			toastError({
				title: t("error_title"),
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="h-10 touch-manipulation sm:h-9"
					type="button"
				>
					<IconPlus className="mr-2 size-4" />
					<span className="text-sm sm:text-xs">
						{t("product_mgmt_add_button")}
					</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("product_mgmt_add")}</DialogTitle>
					<DialogDescription>{t("product_mgmt_add_descr")}</DialogDescription>
				</DialogHeader>

				<div className="relative" aria-busy={loading}>
					<FormSubmitOverlay
						visible={loading}
						statusText={t("submitting") || "Submitting…"}
					/>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("product_status")}</FormLabel>
										<Select
											value={String(field.value)}
											onValueChange={(v) => field.onChange(Number(v))}
											disabled={loading || form.formState.isSubmitting}
										>
											<FormControl>
												<SelectTrigger className="touch-manipulation">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{ProductStatuses.map((s) => {
													const key = getProductStatusTranslationKey(s.value);
													const label =
														key === "product_status_unknown"
															? t("product_status_unknown", {
																	status: String(s.value),
																})
															: t(key);
													return (
														<SelectItem key={s.value} value={String(s.value)}>
															{label}
														</SelectItem>
													);
												})}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="lines"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											{t("product_names")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												value={field.value ?? ""}
												onChange={field.onChange}
												className={cn(
													"min-h-[160px] font-mono text-base sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
												placeholder={t("product_mgmt_bulk_placeholder")}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("product_names_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
								<DialogClose asChild>
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
										className="h-10 w-full touch-manipulation sm:h-9 sm:w-auto"
										type="button"
									>
										<span className="text-sm sm:text-xs">{t("cancel")}</span>
									</Button>
								</DialogClose>

								<Button
									type="submit"
									disabled={
										loading ||
										form.formState.isSubmitting ||
										!form.formState.isValid
									}
									className="h-10 w-full touch-manipulation disabled:opacity-25 sm:h-9 sm:w-auto"
								>
									<span className="text-sm sm:text-xs">{t("create")}</span>
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
