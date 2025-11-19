"use client";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { ProductOption, StoreProductOptionTemplate } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
	ProductOptionSelections,
	StoreProductOptionSelectionsTemplate,
} from "@prisma/client";
import axios from "axios";
import { Pencil, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface props {
	initialData: ProductOption | StoreProductOptionTemplate | null;
	action: string;
}

type formValues = z.infer<typeof formSchema>;

// 規格 | 甜度/冰 | 配料
export const formSchema = z.object({
	//storeId: z.string().min(1),
	optionName: z.string().min(1),
	isRequired: z.boolean(), //必選
	isMultiple: z.boolean(), // 0:radiobox|1:checkboxes

	// 至少選1項 | 最多選3項
	minSelection: z.coerce.number().int().min(0),
	maxSelection: z.coerce.number().int().min(1),
	allowQuantity: z.boolean(), // 允許選擇數量
	minQuantity: z.coerce.number().int().min(0),
	maxQuantity: z.coerce.number().int().min(1),

	// 選項列表
	selections: z.string().min(1, {
		error: "每行輸入一個選項，例如：無糖、少糖、正常。",
	}),
	sortOrder: z.coerce.number().int().min(1),
});

// dialog to handle create and update for ProductOption and ProductOptionSelections object.
export const AddProductOptionDialog: React.FC<props> = ({
	initialData,
	action,
}) => {
	const [loading, setLoading] = useState(false);
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log('AddProductOptionDialog:',JSON.stringify(initialData));

	// parse selection into line separated text

	let s = "";
	if (initialData && "ProductOptionSelections" in initialData) {
		initialData?.ProductOptionSelections.map(
			(selection: ProductOptionSelections) => {
				s += `${selection.name}`;
				s += `:${selection.price}`;
				if (selection.isDefault === true) s += ":1";
				s += "\n";
			},
		);
	} else if (
		initialData &&
		"StoreProductOptionSelectionsTemplate" in initialData
	) {
		initialData?.StoreProductOptionSelectionsTemplate.map(
			(selection: StoreProductOptionSelectionsTemplate) => {
				s += `${selection.name}`;
				s += `:${selection.price}`;
				if (selection.isDefault === true) s += ":1";
				s += "\n";
			},
		);
	}

	const defaultValues = initialData
		? {
				...initialData,
				selections: s,
			}
		: {};

	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);

		//console.log(JSON.stringify(data));

		if (initialData) {
			// edit ProductOption
			if ("ProductOptionSelections" in initialData) {
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/options/${initialData.id}`,
					data,
				);

				toastSuccess({
					title: t("ProductOption") + t("Updated"),
					description: "",
				});
			}
		} else {
			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/options`,
				data,
			);

			toastSuccess({
				title: t("ProductOption") + t("Created"),
				description: "",
			});
		}

		setLoading(false);
		window.location.assign(
			`/storeAdmin/${params.storeId}/products/${params.productId}?tab=options`,
		);
	};

	const pageTitle = t(action) + t("ProductOption");

	if (!params.productId) return <></>;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={"outline"}>
					{action === "Create" ? (
						<Plus className="mr-0 size-4" />
					) : (
						<Pencil className="mr-0 size-4" />
					)}
					{t(action)}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{pageTitle}</DialogTitle>
					<DialogDescription>
						{t("ProductOption_Mgmt_Add_Descr")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="optionName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("ProductOption_optionName")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											type="text"
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("ProductOption_optionName_Descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isRequired"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("ProductOption_isRequired")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_isRequired_Descr")}
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

						<FormField
							control={form.control}
							name="isMultiple"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("ProductOption_isMultiple")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_isMultiple_Descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											ref={field.ref}
											disabled={loading || form.formState.isSubmitting}
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
							<FormField
								control={form.control}
								name="minSelection"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ProductOption_minSelection")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || !form.watch("isMultiple")}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_minSelection_Descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="maxSelection"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ProductOption_maxSelection")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || !form.watch("isMultiple")}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_maxSelection_Descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="allowQuantity"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("ProductOption_allowQuantity")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_allowQuantity_Descr")}
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

						<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
							<FormField
								control={form.control}
								name="minQuantity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ProductOption_minQuantity")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || !form.watch("allowQuantity")}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_minQuantity_Descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="maxQuantity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ProductOption_maxQuantity")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || !form.watch("allowQuantity")}
												type="number"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("ProductOption_maxQuantity_Descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="selections"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("ProductOption_selections")}</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("ProductOption_selections_Descr")}
									</FormDescription>
									<FormMessage />
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

						<div className="flex w-full items-center justify-end space-x-2 pt-6">
							<Button disabled={form.formState.isSubmitting} type="submit">
								{action === "Create" ? t("Create") : t("Update")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={form.formState.isSubmitting}
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
};
