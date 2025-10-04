"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { type ProductColumn, columns } from "./columns";

import { toastError, toastSuccess } from "@/components/Toaster";
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
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProductStatusCombobox } from "../[productId]/product-status-combobox";

interface ProductsClientProps {
	data: ProductColumn[];
}

export const ProductsClient: React.FC<ProductsClientProps> = ({ data }) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

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
			<DataTable searchKey="name" columns={columns} data={data} />
		</>
	);
};

export const formSchema = z.object({
	names: z.string().min(1, {
        error: "product data is required"
    }),
	status: z.number(),
});

/**
 * Dialog to add multiple products at once (批量新增)
 *
 */
export function AddProductsDialog() {
	const [loading, setLoading] = useState(false);
	const params = useParams();

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

		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product`,
			data,
		);
		toastSuccess({
			title: t("Product_created"),
			description: "",
		});

		setLoading(false);
		window.location.assign(`/storeAdmin/${params.storeId}/products`);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={"outline"}>
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
