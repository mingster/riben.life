"use client";

import { IconPlus } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type TableColumn, columns } from "./columns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

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
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface props {
	data: TableColumn[];
}

export const TableClient: React.FC<props> = ({ data }) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("StoreTable_Mgmt")}
					badge={data.length}
					description=""
				/>
				<div>
					<Button
						variant={"outline"}
						onClick={() =>
							router.push(`/storeAdmin/${params.storeId}/tables/new`)
						}
					>
						<IconPlus className="mr-0 size-4" />
						{t("Create")}
					</Button>
					<AddTablesDialog />
				</div>
			</div>
			<Separator />
			<DataTable columns={columns} data={data} />
		</>
	);
};

export const formSchema = z.object({
	prefix: z.string().optional().prefault(""),
	numOfTables: z.number().prefault(1),
	capacity: z.number().prefault(2),
});

export function AddTablesDialog() {
	const [loading, setLoading] = useState(false);
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			numOfTables: 1,
			capacity: 2,
		},
	});

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);

		await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/tables`,
			data,
		);
		toastSuccess({
			title: t("storeTables") + t("Created"),
			description: "",
		});

		setLoading(false);
		window.location.assign(`/storeAdmin/${params.storeId}/tables`);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={"outline"}>
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
					<form onSubmit={form.handleSubmit(onSubmit)}>
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
											{...field}
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
											{...field}
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
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex w-full items-center justify-end space-x-2 pt-6">
							<Button disabled={form.formState.isSubmitting} type="submit">
								{t("Create")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={
											loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting
										}
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
