"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createFacilityAction } from "@/actions/storeAdmin/facility/create-facility";
import { createFacilitySchema } from "@/actions/storeAdmin/facility/create-facility.validation";
import { updateFacilityAction } from "@/actions/storeAdmin/facility/update-facility";
import {
	type UpdateFacilityInput,
	updateFacilitySchema,
} from "@/actions/storeAdmin/facility/update-facility.validation";
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
import { BusinessHoursEditor } from "@/lib/businessHours";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { TableColumn } from "../table-column";
import { mapFacilityToColumn } from "../table-column";

interface EditFacilityDialogProps {
	facility?: TableColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (facility: TableColumn) => void;
	onUpdated?: (facility: TableColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Store default timezone for business hours editor (IANA). */
	defaultTimezone?: string;
}

export function EditFacilityDialog({
	facility,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
	defaultTimezone = "Asia/Taipei",
}: EditFacilityDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(facility) && !isNew;

	const defaultValues = facility
		? {
				...facility,
			}
		: {
				storeId: String(params.storeId),
				id: "",
				facilityName: "",
				capacity: 1,
				defaultCost: 0,
				defaultCredit: 0,
				defaultDuration: 60,
				businessHours: null,
				description: null,
				location: null,
				travelInfo: null,
			};

	// Use createFacilitySchema when isNew, updateFacilitySchema when editing
	const schema = useMemo(
		() => (isEditMode ? updateFacilitySchema : createFacilitySchema),
		[isEditMode],
	);

	// Form input type: UpdateFacilityInput when editing, CreateFacilityInput when creating
	// We use UpdateFacilityInput as base but id is optional for create mode
	type FormInput = Omit<UpdateFacilityInput, "id"> & { id?: string };

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
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
			title: t("facility") + t(isEditMode ? "updated" : "created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createFacilityAction(String(params.storeId), {
					facilityName: values.facilityName,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					businessHours: values.businessHours || null,
					description: values.description || null,
					location: values.location || null,
					travelInfo: values.travelInfo || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.facility) {
					handleSuccess(mapFacilityToColumn(result.data.facility));
				}
			} else {
				const facilityId = facility?.id;
				if (!facilityId) {
					toastError({
						title: t("error_title"),
						description: "Facility not found.",
					});
					return;
				}

				const result = await updateFacilityAction(String(params.storeId), {
					id: facilityId,
					facilityName: values.facilityName,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					businessHours: values.businessHours || null,
					description: values.description || null,
					location: values.location || null,
					travelInfo: values.travelInfo || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.facility) {
					handleSuccess(mapFacilityToColumn(result.data.facility));
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("facility_mgmt_edit") : t("facility_mgmt_add")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("facility_name_descr")
							: t("facility_mgmt_add_descr")}
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
							name="facilityName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("facility_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={(event) => field.onChange(event.target.value)}
											className="h-10 text-base sm:h-9 sm:text-sm"
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
									<FormLabel>
										{t("facility_seats")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
											className="h-10 text-base sm:h-9 sm:text-sm"
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
									<FormLabel>
										{t("facility_default_credit")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
											className="h-10 text-base sm:h-9 sm:text-sm"
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
									<FormLabel>
										{t("facility_default_cost")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
											className="h-10 text-base sm:h-9 sm:text-sm"
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
									<FormLabel>
										{t("facility_default_duration")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : ""
											}
											onChange={(event) => field.onChange(event.target.value)}
											className="h-10 text-base sm:h-9 sm:text-sm"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="businessHours"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>{t("business_hours")}</FormLabel>
									<FormControl>
										<BusinessHoursEditor
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={(value) =>
												field.onChange(value === "" ? null : value)
											}
											defaultTimezone={defaultTimezone}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("business_hours_format_hint")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("facility_description")}</FormLabel>
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
						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("facility_location")}</FormLabel>
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
						<FormField
							control={form.control}
							name="travelInfo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("facility_travel_info")}</FormLabel>
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

						{/* Validation Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									// Map field names to user-friendly labels using i18n
									const fieldLabels: Record<string, string> = {
										facilityName: t("facility_name") || "Facility Name",
										capacity: t("facility_seats") || "Capacity",
										defaultCost: t("facility_default_cost") || "Default Cost",
										defaultCredit:
											t("facility_default_credit") || "Default Credit",
										defaultDuration:
											t("facility_default_duration") || "Default Duration",
										businessHours: t("business_hours") || "Business Hours",
										description: t("facility_description") || "Description",
										location: t("facility_location") || "Location",
										travelInfo: t("facility_travel_info") || "Travel Info",
									};
									const fieldLabel = fieldLabels[field] || field;
									return (
										<div
											key={field}
											className="text-sm text-destructive flex items-start gap-2"
										>
											<span className="font-medium">{fieldLabel}:</span>
											<span>{error.message as string}</span>
										</div>
									);
								})}
							</div>
						)}

						<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
								className="w-full sm:w-auto h-10 sm:h-9"
							>
								<span className="text-sm sm:text-xs">{t("cancel")}</span>
							</Button>
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="w-full sm:w-auto h-10 sm:h-9 disabled:opacity-25"
							>
								<span className="text-sm sm:text-xs">
									{isEditMode ? t("save") : t("create")}
								</span>
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
