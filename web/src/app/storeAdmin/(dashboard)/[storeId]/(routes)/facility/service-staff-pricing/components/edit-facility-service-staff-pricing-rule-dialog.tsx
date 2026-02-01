"use client";

import { createFacilityServiceStaffPricingRuleAction } from "@/actions/storeAdmin/facility-service-staff-pricing/create-facility-service-staff-pricing-rule";
import { createFacilityServiceStaffPricingRuleSchema } from "@/actions/storeAdmin/facility-service-staff-pricing/create-facility-service-staff-pricing-rule.validation";
import { updateFacilityServiceStaffPricingRuleAction } from "@/actions/storeAdmin/facility-service-staff-pricing/update-facility-service-staff-pricing-rule";
import {
	updateFacilityServiceStaffPricingRuleSchema,
	type UpdateFacilityServiceStaffPricingRuleInput,
} from "@/actions/storeAdmin/facility-service-staff-pricing/update-facility-service-staff-pricing-rule.validation";
import { useTranslation } from "@/app/i18n/client";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import { Loader } from "@/components/loader";
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
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { FacilityCombobox } from "../../../components/facility-combobox";
import type { FacilityServiceStaffPricingRuleColumn } from "../facility-service-staff-pricing-rule-column";

interface EditFacilityServiceStaffPricingRuleDialogProps {
	rule?: FacilityServiceStaffPricingRuleColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (rule: FacilityServiceStaffPricingRuleColumn) => void;
	onUpdated?: (rule: FacilityServiceStaffPricingRuleColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditFacilityServiceStaffPricingRuleDialog({
	rule,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditFacilityServiceStaffPricingRuleDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// Fetch service staff for combobox
	const serviceStaffUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/service-staff`;
	const serviceStaffFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeServiceStaff } = useSWR<ServiceStaffColumn[]>(
		serviceStaffUrl,
		serviceStaffFetcher,
	);

	const isEditMode = Boolean(rule) && !isNew;

	const defaultValues = rule
		? {
				...rule,
				facilityId: rule.facilityId || "",
				serviceStaffId: rule.serviceStaffId || "",
			}
		: {
				storeId: String(params.storeId),
				id: "",
				facilityId: "",
				serviceStaffId: "",
				facilityDiscount: 0,
				serviceStaffDiscount: 0,
				priority: 0,
				isActive: true,
			};

	// Use createFacilityServiceStaffPricingRuleSchema when isNew, updateFacilityServiceStaffPricingRuleSchema when editing
	const schema = useMemo(
		() =>
			isEditMode
				? updateFacilityServiceStaffPricingRuleSchema
				: createFacilityServiceStaffPricingRuleSchema,
		[isEditMode],
	);

	// Form input type: UpdateFacilityServiceStaffPricingRuleInput when editing, CreateFacilityServiceStaffPricingRuleInput when creating
	type FormInput = Omit<UpdateFacilityServiceStaffPricingRuleInput, "id"> & {
		id?: string;
	};

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const {
		formState: { errors },
		clearErrors,
	} = form;

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
			clearErrors();
		}
	};

	const handleSuccess = (
		updatedRule: FacilityServiceStaffPricingRuleColumn,
	) => {
		if (isEditMode) {
			onUpdated?.(updatedRule);
		} else {
			onCreated?.(updatedRule);
		}

		toastSuccess({
			title:
				t("facility_service_staff_pricing_rule") +
				t(isEditMode ? "updated" : "created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			const facilityIdValue =
				values.facilityId && values.facilityId.trim() !== ""
					? values.facilityId
					: null;

			const serviceStaffIdValue =
				values.serviceStaffId && values.serviceStaffId.trim() !== ""
					? values.serviceStaffId
					: null;

			if (!isEditMode) {
				const result = await createFacilityServiceStaffPricingRuleAction(
					String(params.storeId),
					{
						facilityId: facilityIdValue,
						serviceStaffId: serviceStaffIdValue,
						facilityDiscount: values.facilityDiscount,
						serviceStaffDiscount: values.serviceStaffDiscount,
						priority: values.priority,
						isActive: values.isActive,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					handleSuccess(result.data.rule);
				}
			} else {
				const ruleId = rule?.id;
				if (!ruleId) {
					toastError({
						title: t("error_title"),
						description: "Pricing rule not found.",
					});
					return;
				}

				const result = await updateFacilityServiceStaffPricingRuleAction(
					String(params.storeId),
					{
						id: ruleId,
						facilityId: facilityIdValue,
						serviceStaffId: serviceStaffIdValue,
						facilityDiscount: values.facilityDiscount,
						serviceStaffDiscount: values.serviceStaffDiscount,
						priority: values.priority,
						isActive: values.isActive,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					handleSuccess(result.data.rule);
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

	// Find selected service staff for combobox
	const selectedServiceStaff = useMemo(() => {
		if (!storeServiceStaff || !form.watch("serviceStaffId")) return null;
		return (
			storeServiceStaff.find(
				(staff) => staff.id === form.watch("serviceStaffId"),
			) || null
		);
	}, [storeServiceStaff, form.watch("serviceStaffId")]);

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit_facility_service_staff_pricing_rule")
							: t("create_facility_service_staff_pricing_rule")}
					</DialogTitle>
					<DialogDescription>
						{t("facility_service_staff_pricing_rules_descr")}
					</DialogDescription>
				</DialogHeader>

				<div className="relative">
					{(loading || form.formState.isSubmitting) && (
						<div
							className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
							aria-hidden="true"
						>
							<div className="flex flex-col items-center gap-3">
								<Loader />
								<span className="text-sm font-medium text-muted-foreground">
									{t("saving") || "Saving..."}
								</span>
							</div>
						</div>
					)}
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit, (errors) => {
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
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="facilityId"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: ""
											}
										>
											<FormLabel>{t("facility")}</FormLabel>
											<div className="w-full">
												<FormControl>
													<FacilityCombobox
														storeId={String(params.storeId)}
														disabled={loading || form.formState.isSubmitting}
														defaultValue={field.value || ""}
														onValueChange={(newValue) => {
															field.onChange(newValue || null);
														}}
													/>
												</FormControl>
											</div>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("leave_empty_to_apply_to_all_facilities")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="serviceStaffId"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: ""
											}
										>
											<FormLabel>{t("service_staff")}</FormLabel>
											<FormControl>
												{storeServiceStaff ? (
													<ServiceStaffCombobox
														serviceStaff={storeServiceStaff}
														disabled={loading || form.formState.isSubmitting}
														defaultValue={selectedServiceStaff}
														onValueChange={(newValue) => {
															field.onChange(newValue?.id || null);
														}}
														allowEmpty={true}
													/>
												) : (
													<div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
														{t("loading")}...
													</div>
												)}
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("leave_empty_to_apply_to_all_service_staff")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="priority"
								render={({ field, fieldState }) => (
									<FormItem
										className={
											fieldState.error
												? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
												: ""
										}
									>
										<FormLabel>{t("priority")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined
														? field.value.toString()
														: "0"
												}
												onChange={(event) =>
													field.onChange(Number(event.target.value))
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("higher_priority_rules_are_evaluated_first")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="facilityDiscount"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: ""
											}
										>
											<FormLabel>{t("facility_discount")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													value={
														field.value !== null && field.value !== undefined
															? field.value.toString()
															: "0"
													}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? 0 : Number(value));
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("facility_discount_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="serviceStaffDiscount"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: ""
											}
										>
											<FormLabel>{t("service_staff_discount")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													value={
														field.value !== null && field.value !== undefined
															? field.value.toString()
															: "0"
													}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? 0 : Number(value));
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("service_staff_discount_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="isActive"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("active")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("facility_service_staff_pricing_rule_status_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
											/>
										</FormControl>
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
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												facilityId: t("facility") || "Facility",
												serviceStaffId: t("service_staff") || "Service Staff",
												facilityDiscount:
													t("facility_discount") || "Facility Discount",
												serviceStaffDiscount:
													t("service_staff_discount") ||
													"Service Staff Discount",
												priority: t("priority") || "Priority",
												isActive: t("active") || "Active",
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
										},
									)}
								</div>
							)}

							<DialogFooter className="flex w-full justify-end space-x-2">
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{isEditMode ? t("edit") : t("create")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
