"use client";

import { createFacilityPricingRuleAction } from "@/actions/storeAdmin/facility-pricing/create-facility-pricing-rule";
import { createFacilityPricingRuleSchema } from "@/actions/storeAdmin/facility-pricing/create-facility-pricing-rule.validation";
import { updateFacilityPricingRuleAction } from "@/actions/storeAdmin/facility-pricing/update-facility-pricing-rule";
import {
	updateFacilityPricingRuleSchema,
	type UpdateFacilityPricingRuleInput,
} from "@/actions/storeAdmin/facility-pricing/update-facility-pricing-rule.validation";
import { useTranslation } from "@/app/i18n/client";
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
import { FacilityCombobox } from "../../../components/facility-combobox";
import type { FacilityPricingRuleColumn } from "../facility-pricing-rule-column";

interface EditFacilityPricingRuleDialogProps {
	rule?: FacilityPricingRuleColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (rule: FacilityPricingRuleColumn) => void;
	onUpdated?: (rule: FacilityPricingRuleColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditFacilityPricingRuleDialog({
	rule,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditFacilityPricingRuleDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(rule) && !isNew;

	const defaultValues = rule
		? {
				...rule,
				facilityId: rule.facilityId || "",
			}
		: {
				storeId: String(params.storeId),
				id: "",
				facilityId: "",
				name: "",
				priority: 0,
				dayOfWeek: null,
				startTime: null,
				endTime: null,
				cost: null,
				credit: null,
				isActive: true,
			};

	// Use createFacilityPricingRuleSchema when isNew, updateFacilityPricingRuleSchema when editing
	const schema = useMemo(
		() =>
			isEditMode
				? updateFacilityPricingRuleSchema
				: createFacilityPricingRuleSchema,
		[isEditMode],
	);

	// Form input type: UpdateFacilityPricingRuleInput when editing, CreateFacilityPricingRuleInput when creating
	type FormInput = Omit<UpdateFacilityPricingRuleInput, "id"> & {
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

	const handleSuccess = (updatedRule: FacilityPricingRuleColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedRule);
		} else {
			onCreated?.(updatedRule);
		}

		toastSuccess({
			title: t("Pricing_Rule") + t(isEditMode ? "updated" : "created"),
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

			if (!isEditMode) {
				const result = await createFacilityPricingRuleAction(
					String(params.storeId),
					{
						facilityId: facilityIdValue,
						name: values.name,
						priority: values.priority,
						dayOfWeek: values.dayOfWeek || null,
						startTime: values.startTime || null,
						endTime: values.endTime || null,
						cost:
							values.cost !== null && values.cost !== undefined
								? values.cost
								: null,
						credit:
							values.credit !== null && values.credit !== undefined
								? values.credit
								: null,
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

				const result = await updateFacilityPricingRuleAction(
					String(params.storeId),
					{
						id: ruleId,
						facilityId: facilityIdValue,
						name: values.name,
						priority: values.priority,
						dayOfWeek: values.dayOfWeek || null,
						startTime: values.startTime || null,
						endTime: values.endTime || null,
						cost:
							values.cost !== null && values.cost !== undefined
								? values.cost
								: null,
						credit:
							values.credit !== null && values.credit !== undefined
								? values.credit
								: null,
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

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("edit") : t("create") + t("facility_pricing_rules")}
					</DialogTitle>
					<DialogDescription>
						{" "}
						{t("facility_pricing_rules_descr")}
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
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("pricing_rule_name")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
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
								name="facilityId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("facility")}</FormLabel>
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
										<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("pricing_rule_priority")}</FormLabel>
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
											{t("pricing_rule_priority_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="dayOfWeek"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("pricing_rule_day_of_week")}</FormLabel>
										<FormControl>
											<Input
												type="text"
												disabled={loading || form.formState.isSubmitting}
												placeholder='e.g., "weekend", "weekday", or [1,3,5]'
												value={field.value || ""}
												onChange={(event) =>
													field.onChange(event.target.value || null)
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="startTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("pricing_rule_start_time")}</FormLabel>
											<FormControl>
												<Input
													type="time"
													disabled={loading || form.formState.isSubmitting}
													value={field.value || ""}
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
									name="endTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("pricing_rule_end_time")}</FormLabel>
											<FormControl>
												<Input
													type="time"
													disabled={loading || form.formState.isSubmitting}
													value={field.value || ""}
													onChange={(event) =>
														field.onChange(event.target.value || null)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="cost"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("pricing_rule_cost")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													value={
														field.value !== null && field.value !== undefined
															? field.value.toString()
															: ""
													}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? null : Number(value));
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("pricing_rule_cost_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="credit"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("pricing_rule_credit")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													value={
														field.value !== null && field.value !== undefined
															? field.value.toString()
															: ""
													}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? null : Number(value));
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("pricing_rule_credit_descr")}
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
											<FormLabel>{t("pricing_rule_status")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("pricing_rule_status_descr")}
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
												dayOfWeek: t("Day_of_Week") || "Day of Week",
												startTime: t("Start_Time") || "Start Time",
												endTime: t("End_Time") || "End Time",
												cost: t("Cost") || "Cost",
												credit: t("Credit") || "Credit",
												priority: t("Priority") || "Priority",
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
