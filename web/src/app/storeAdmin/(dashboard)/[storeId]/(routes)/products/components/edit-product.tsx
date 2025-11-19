"use client";

import { useTranslation } from "@/app/i18n/client";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createStoreProductAction } from "@/actions/storeAdmin/product/create-product";
import type { ProductColumn } from "../product-column";
import { ProductStatusCombobox } from "../[productId]/product-status-combobox";

const formSchema = z.object({
	name: z.string().min(1, { message: "Product name is required" }),
	description: z.string().optional(),
	price: z.number().min(0),
	status: z.number(),
	isFeatured: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProductProps {
	product?: ProductColumn | null;
	isNew?: boolean;
	onCreated?: (product: ProductColumn) => void;
	onUpdated?: (product: ProductColumn) => void;
	trigger?: React.ReactNode;
}

export const EditProduct: React.FC<EditProductProps> = ({
	product = null,
	isNew = false,
	onCreated,
	onUpdated,
	trigger,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<FormValues>(
		() => ({
			name: product?.name ?? "",
			description: "",
			price: product?.price ?? 0,
			status: product?.status ?? Number(ProductStatus.Published),
			isFeatured: product?.isFeatured ?? false,
		}),
		[product],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const handleOpenChange = (value: boolean) => {
		setOpen(value);
		if (!value) {
			form.reset(defaultValues);
		}
	};

	const onSubmit = async (data: FormValues) => {
		setLoading(true);
		try {
			if (!product || isNew) {
				const result = await createStoreProductAction({
					storeId: String(params.storeId),
					name: data.name,
					description: data.description ?? "",
					price: data.price,
					status: data.status,
					isFeatured: data.isFeatured ?? false,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else if (result?.data?.product) {
					onCreated?.(result.data.product);
					toastSuccess({
						title: t("Product_created"),
						description: "",
					});
					setOpen(false);
					form.reset(defaultValues);
				}
			} else {
				// TODO: wire update safe-action for inline editing
				toastError({
					title: t("Error"),
					description: "Inline product editing is not supported yet.",
				});
			}
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
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
						{isNew ? t("Create") : t("Edit")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isNew ? t("Create") : t("Product_Mgmt_Edit")}
					</DialogTitle>
					<DialogDescription>{t("Product_Mgmt_Add_Descr")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Product_name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("input_placeholder1") + t("Product_name")}
											disabled={loading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Product_description")}</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("Product_description_placeholder")}
											disabled={loading}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("Product_description_helper")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="price"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Product_price")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												step="0.01"
												disabled={loading}
												value={Number.isNaN(field.value) ? "" : field.value}
												onChange={(event) =>
													field.onChange(
														event.target.value === ""
															? 0
															: Number(event.target.value),
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("Product_status")}</FormLabel>
										<FormControl>
											<ProductStatusCombobox
												disabled={loading}
												defaultValue={field.value}
												onChange={(value) => field.onChange(Number(value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<FormLabel>{t("Product_featured")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("Product_isFeatured_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter className="flex flex-row justify-end space-x-2">
							<Button
								variant="outline"
								type="button"
								disabled={loading}
								onClick={() => handleOpenChange(false)}
							>
								{t("Cancel")}
							</Button>
							<Button
								type="submit"
								disabled={loading || !form.formState.isValid}
							>
								{isNew ? t("Create") : t("Save")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default EditProduct;
