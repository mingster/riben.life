"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import type { ProductColumn } from "./columns";

import { toastError, toastSuccess } from "@/components/toaster";
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
import { Textarea } from "@/components/ui/textarea";
import { ProductStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { type AxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProductStatusCombobox } from "../[productId]/product-status-combobox";
import { formatDateTime } from "@/utils/datetime-utils";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { ProductStatuses } from "@/types/enum";
import Currency from "@/components/currency";
import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";
import { CellAction } from "./cell-action";

interface ProductsClientProps {
	serverData: ProductColumn[];
}

export const ProductsClient: React.FC<ProductsClientProps> = ({
	serverData,
}) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [data, setData] = useState<ProductColumn[]>(serverData);

	useEffect(() => {
		setData(serverData);
	}, [serverData]);

	const handleCreated = useCallback((newProducts: ProductColumn[]) => {
		if (!newProducts?.length) return;
		setData((prev) => [...prev, ...newProducts]);
	}, []);

	const handleDeleted = useCallback((productId: string) => {
		setData((prev) => prev.filter((item) => item.id !== productId));
	}, []);

	const tableColumns = useMemo<ColumnDef<ProductColumn>[]>(() => {
		return [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_name")} />
				),
				cell: ({ row }) => (
					<Link
						className="pl-0"
						title="click to edit"
						href={`./products/${row.original.id}`}
					>
						{row.getValue("name")}
					</Link>
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_status")} />
				),
				cell: ({ row }) => {
					const status = ProductStatuses[Number(row.getValue("status"))];

					return <div>{t(`ProductStatus_${status.label}`)}</div>;
				},
			},
			{
				accessorKey: "hasOptions",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("Product_hasOptions")}
					/>
				),
				cell: ({ row }) => {
					const val =
						row.getValue("hasOptions") === true ? (
							<CheckIcon className="text-green-400  size-4" />
						) : (
							<XIcon className="text-red-400 size-4" />
						);

					return <div className="pl-3">{val}</div>;
				},
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_price")} />
				),
				cell: ({ row }) => {
					const price = Number(row.getValue("price"));

					return <Currency value={price} />;
				},
			},
			{
				accessorKey: "stock",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("Product_stock")} />
				),
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("updated")} />
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellAction data={row.original} onDeleted={handleDeleted} />
				),
			},
		];
	}, [handleDeleted, t]);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("Product_Mgmt")}
					badge={data.length}
					description={t("Product_Mgmt_descr")}
				/>
				<div>
					{/*新增 */}
					<Button
						variant={"outline"}
						onClick={() =>
							router.push(`/storeAdmin/${params.storeId}/products/new`)
						}
					>
						<Plus className="mr-0 size-4" />
						{t("Create")}
					</Button>
					{/*批量新增 */}
					<AddProductsDialog />
				</div>
			</div>
			<Separator />
			<DataTable searchKey="name" columns={tableColumns} data={data} />
		</>
	);
};

export const formSchema = z.object({
	names: z.string().min(1, {
		error: "product data is required",
	}),
	status: z.number(),
});

/**
 * Dialog to add multiple products at once (批量新增)
 *
 */
interface AddProductsDialogProps {
	onCreated?: (newProducts: ProductColumn[]) => void;
}

export function AddProductsDialog({ onCreated }: AddProductsDialogProps) {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			names: "",
			status: Number(ProductStatus.Published),
		},
	});

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);

		try {
			const response = await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product`,
				data,
			);
			const createdProducts = normalizeCreatedProducts(response?.data);
			if (createdProducts.length > 0) {
				onCreated?.(createdProducts);
			} else {
				router.refresh();
			}

			toastSuccess({
				title: t("Product_created"),
				description: "",
			});
			form.reset();
			setOpen(false);
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({ title: t("Error"), description: err.message });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={"outline"} onClick={() => setOpen(true)}>
					<Plus className="mr-0 size-4" />
					{t("Product_Mgmt_AddButton")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					{/*批量新增*/}
					<DialogTitle>{t("Product_Mgmt_Add")}</DialogTitle>
					<DialogDescription>{t("Product_Mgmt_Add_Descr")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="names"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Product_names")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormDescription>{t("Product_names_Descr")}</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
									<div className="space-y-1 leading-none">
										<FormLabel>{t("Product_status")}</FormLabel>
										<FormDescription>
											{t("Product_status_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<div>
											<ProductStatusCombobox
												disabled={loading || form.formState.isSubmitting}
												defaultValue={field.value}
												onChange={field.onChange}
											/>
										</div>
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
								type="submit"
							>
								{t("Create")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
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

const normalizeCreatedProducts = (payload: unknown): ProductColumn[] => {
	const rawProducts = Array.isArray(payload)
		? payload
		: Array.isArray((payload as { products?: unknown[] })?.products)
			? (payload as { products: unknown[] }).products
			: [];

	const formatted: ProductColumn[] = [];

	for (const item of rawProducts) {
		if (!item || typeof item !== "object") continue;
		const product = item as Record<string, unknown>;

		if (typeof product.id !== "string") continue;

		const productAttribute =
			(product.ProductAttribute as Record<string, unknown>) ?? {};

		const updatedAtRaw = product.updatedAt ?? new Date();
		const updatedAt =
			updatedAtRaw instanceof Date
				? updatedAtRaw
				: new Date(updatedAtRaw as string);

		const stockValue = productAttribute.stock ?? product.stock;

		formatted.push({
			id: product.id,
			name: String(product.name ?? ""),
			status: Number(product.status ?? 0),
			price: Number(product.price ?? 0),
			isFeatured: Boolean(product.isFeatured),
			updatedAt: formatDateTime(updatedAt),
			stock:
				stockValue === undefined || stockValue === null
					? undefined
					: Number(stockValue),
			isRecurring:
				productAttribute.isRecurring !== undefined
					? Boolean(productAttribute.isRecurring)
					: product.isRecurring !== undefined
						? Boolean(product.isRecurring)
						: undefined,
			hasOptions: Array.isArray(product.ProductOptions)
				? product.ProductOptions.length > 0
				: Boolean(product.hasOptions),
		});
	}

	return formatted;
};
