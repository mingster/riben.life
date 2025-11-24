"use client";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";

import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

import { toastError, toastSuccess } from "@/components/toaster";
import { useI18n } from "@/providers/i18n-provider";
import { Plus } from "lucide-react";

import { updateFaqCategoryAction } from "@/actions/storeAdmin/faqCategory/update-faq-category";
import {
	type UpdateFaqCategoryInput,
	updateFaqCategorySchema,
} from "@/actions/storeAdmin/faqCategory/update-faq-category.validation";
import { Input } from "@/components/ui/input";
import type { FaqCategory } from "@/types";
import type { FaqCategoryWithFaqCount } from "./client-faq-category";

interface props {
	item: FaqCategoryWithFaqCount;
	onUpdated?: (newValue: FaqCategoryWithFaqCount) => void;
}

export const EditFaqCategory: React.FC<props> = ({ item, onUpdated }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = item
		? {
				...item,
			}
		: {
				id: "new",
				name: "new",
			};

	const form = useForm<UpdateFaqCategoryInput>({
		resolver: zodResolver(updateFaqCategorySchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	//console.log("disabled", loading || form.formState.isSubmitting);

	// commit to db and return the updated category
	async function onSubmit(data: UpdateFaqCategoryInput) {
		//console.log("data", data);
		setLoading(true);
		const result = await updateFaqCategoryAction(data);
		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else if (result.data) {
			// also update data from parent component or caller
			const updatedData = {
				id: result.data.id,
				storeId: result.data.storeId,
				localeId: result.data.localeId,
				name: result.data.name,
				sortOrder: result.data.sortOrder,
				faqCount: result.data.FAQ.length,
			} as FaqCategoryWithFaqCount;

			//console.log("onSubmit", updatedData);
			onUpdated?.(updatedData);

			if (data.id === "new") {
				toastSuccess({ description: "Category created." });
			} else {
				toastSuccess({ description: "Category updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Drawer
				direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DrawerTrigger asChild>
					{item === null || item.id === "new" ? (
						<Button
							variant={"outline"}
							onClick={() => {
								setIsOpen(true);
							}}
						>
							<Plus className="mr-0 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
							onClick={() => setIsOpen(true)}
						>
							{defaultValues.name}
						</Button>
					)}
				</DrawerTrigger>

				<DrawerContent className="p-2 space-y-2 w-full">
					<DrawerHeader className="">
						<DrawerTitle>{t("FaqCategory")}</DrawerTitle>
						<DrawerDescription>
							{
								//display form error if any
							}
						</DrawerDescription>
					</DrawerHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="localeId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Locale</FormLabel>
										<FormControl>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select a default locale" />
												</SelectTrigger>
												<SelectContent>
													<LocaleSelectItems />
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>{t("FaqCategory_name")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder={
													t("input_placeholder1") + t("FaqCategory_name")
												}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="sortOrder"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>{t("FaqCategory_sortOrder")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												placeholder={
													t("input_placeholder1") + t("FaqCategory_sortOrder")
												}
												{...field}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
								className="disabled:opacity-25"
							>
								{t("submit")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									setIsOpen(false);
									//router.push(`/${params.storeId}/support`);
								}}
								className="ml-2"
							>
								{t("cancel")}
							</Button>
						</form>
					</Form>
				</DrawerContent>
			</Drawer>
		</>
	);
};
