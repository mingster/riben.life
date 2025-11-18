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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TableColumn } from "../table-column";
import { createFacilityAction } from "@/actions/storeAdmin/facility/create-facility";
import { updateFacilityAction } from "@/actions/storeAdmin/facility/update-facility";

const formSchema = z.object({
	facilityName: z.string().min(1, { message: "name is required" }),
	capacity: z.coerce.number().int().min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface EditFacilityDialogProps {
	facility?: TableColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (facility: TableColumn) => void;
	onUpdated?: (facility: TableColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditFacilityDialog({
	facility,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditFacilityDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(facility) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			facilityName: facility?.facilityName ?? "",
			capacity: facility?.capacity ?? 2,
		}),
		[facility],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues,
	});

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	const handleSuccess = (updatedFacility: TableColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedFacility);
		} else {
			onCreated?.(updatedFacility);
		}

		toastSuccess({
			title: t("storeTables") + t(isEditMode ? "Updated" : "Created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormValues) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createFacilityAction({
					storeId: String(params.storeId),
					facilityName: values.facilityName,
					capacity: values.capacity,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.facility) {
					handleSuccess(result.data.facility);
				}
			} else {
				const facilityId = facility?.id;
				if (!facilityId) {
					toastError({
						title: t("Error"),
						description: "Facility not found.",
					});
					return;
				}

				const result = await updateFacilityAction({
					storeId: String(params.storeId),
					id: facilityId,
					facilityName: values.facilityName,
					capacity: values.capacity,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.facility) {
					handleSuccess(result.data.facility);
				}
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
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("Facility_Mgmt_Edit") : t("Facility_Mgmt_Add")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("Facility_Name_Descr")
							: t("Facility_Mgmt_Add_Descr")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="facilityName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Facility_Name")}</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
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

						<DialogFooter className="flex w-full justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{isEditMode ? t("Save") : t("Create")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("Cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
