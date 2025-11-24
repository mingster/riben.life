"use client";

import { createFacilitiesAction } from "@/actions/storeAdmin/facility/create-facilities";
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { TableColumn } from "../table-column";
import {
	CreateFacilitiesInput,
	createFacilitiesSchema,
} from "@/actions/storeAdmin/facility/create-facilities.validation";

interface BulkAddFacilitiesDialogProps {
	onCreatedMany?: (facilities: TableColumn[]) => void;
}

export function BulkAddFacilitiesDialog({
	onCreatedMany,
}: BulkAddFacilitiesDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<CreateFacilitiesInput>({
		resolver: zodResolver(
			createFacilitiesSchema,
		) as Resolver<CreateFacilitiesInput>,
		defaultValues: {
			storeId: String(params.storeId),
			prefix: "",
			numOfFacilities: 1,
			capacity: 2,
			defaultCost: 0,
			defaultCredit: 0,
			defaultDuration: 60,
			businessHours: null,
		},
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const onSubmit = async (values: CreateFacilitiesInput) => {
		setLoading(true);
		try {
			const result = await createFacilitiesAction({
				storeId: String(params.storeId),
				prefix: values.prefix?.trim() ?? "",
				numOfFacilities: values.numOfFacilities,
				capacity: values.capacity,
				defaultCost: values.defaultCost,
				defaultCredit: values.defaultCredit,
				defaultDuration: values.defaultDuration,
				businessHours: values.businessHours || null,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			const createdFacilities = result?.data?.createdFacilities ?? [];
			onCreatedMany?.(createdFacilities);

			toastSuccess({
				title: t("Facility") + t("created"),
				description: "",
			});

			form.reset({
				prefix: "",
				numOfFacilities: 1,
				capacity: 2,
				defaultCost: 0,
				defaultCredit: 0,
				defaultDuration: 60,
				businessHours: null,
			});
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

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			form.reset({
				prefix: "",
				numOfFacilities: 1,
				capacity: 2,
				defaultCost: 0,
				defaultCredit: 0,
				defaultDuration: 60,
				businessHours: null,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" onClick={() => setOpen(true)}>
					<IconPlus className="mr-0 size-4" />
					{t("Facility_mgmt_bulk_add_button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("Facility_mgmt_bulk_add_button")}</DialogTitle>
					<DialogDescription>
						{t("Facility_mgmt_bulk_add_descr")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, (errors) => {
							// Show validation errors when form is invalid
							const firstErrorKey = Object.keys(errors)[0];
							if (firstErrorKey) {
								const error = errors[firstErrorKey as keyof typeof errors];
								const errorMessage = error?.message;
								if (errorMessage) {
									toastError({
										title: t("error_title"),
										description: errorMessage,
									});
								}
							}
						})}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="prefix"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_mgmt_prefix")}</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("Facility_mgmt_prefix_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="numOfFacilities"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_NumToAdd")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
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
									<FormLabel>{t("Facility_Seats")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="defaultCost"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_Default_Cost")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="defaultCredit"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_Default_Credit")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="defaultDuration"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_Default_Duration")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="businessHours"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("business_hours")}</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											className="font-mono min-h-[100px]"
											placeholder=""
											value={field.value ?? ""}
											onChange={(event) =>
												field.onChange(event.target.value || null)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex w-full items-center justify-end space-x-2 pt-2">
							<Button
								type="submit"
								className="disabled:opacity-25"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{t("Create")}
							</Button>

							<DialogFooter className="sm:justify-start">
								<DialogClose asChild>
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
										type="button"
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
