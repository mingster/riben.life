"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type CategoryColumn, columns } from "./columns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

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
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface categoryClientProps {
	data: CategoryColumn[];
}

export const CategoryClient: React.FC<categoryClientProps> = ({ data }) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("Category_Mgmt")}
					badge={data.length}
					description={t("Category_Mgmt_descr")}
				/>
				<div>
					{/*新增 */}
					<Button
						variant={"outline"}
						onClick={() =>
							router.push(`/storeAdmin/${params.storeId}/categories/new`)
						}
					>
						<Plus className="mr-0 size-4" />
						{t("Create")}
					</Button>

					{/*批量新增 */}
					<AddCategoriesDialog />
				</div>
			</div>

			<Separator />
			<DataTable searchKey="name" columns={columns} data={data} />
		</>
	);
};

export const formSchema = z.object({
	names: z.string().min(1, { message: "name is required" }),
	isFeatured: z.boolean().default(true).optional(),
});

export function AddCategoriesDialog() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { isFeatured: true },
	});

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);

		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/categories`,
			data,
		);
		toast({
			title: t("Category") + t("Created"),
			description: "",
			variant: "success",
		});

		setLoading(false);
		window.location.assign(`/storeAdmin/${params.storeId}/categories`);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={"outline"}>
					<Plus className="mr-0 size-4" />
					{t("Category_Mgmt_AddButton")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					{/*批量新增*/}
					<DialogTitle>{t("Category_Mgmt_Add")}</DialogTitle>
					<DialogDescription>{t("Category_Mgmt_Add_Descr")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="names"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Category_names")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormDescription>{t("Category_names_Descr")}</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isFeatured"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between p-0 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("Category_isFeatured")}</FormLabel>
										<FormDescription>
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
