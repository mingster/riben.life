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
import { createFacilityPricingRuleAction } from "@/actions/storeAdmin/facility-pricing/create-facility-pricing-rule";
import { updateFacilityPricingRuleAction } from "@/actions/storeAdmin/facility-pricing/update-facility-pricing-rule";
import {
	createFacilityPricingRuleSchema,
	type CreateFacilityPricingRuleInput,
} from "@/actions/storeAdmin/facility-pricing/create-facility-pricing-rule.validation";
import {
	updateFacilityPricingRuleSchema,
	type UpdateFacilityPricingRuleInput,
} from "@/actions/storeAdmin/facility-pricing/update-facility-pricing-rule.validation";
import { FacilityCombobox } from "../../components/facility-combobox";
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
	const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
		rule?.facilityId || "",
	);

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
		setSelectedFacilityId(rule?.facilityId || "");
	}, [defaultValues, form, rule?.facilityId]);

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
			title: t("Pricing_Rule") + t(isEditMode ? "Updated" : "Created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			const facilityIdValue =
				selectedFacilityId && selectedFacilityId.trim() !== ""
					? selectedFacilityId
					: null;

			if (!isEditMode) {
				const result = await createFacilityPricingRuleAction({
					storeId: String(params.storeId),
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
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
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
						title: t("Error"),
						description: "Pricing rule not found.",
					});
					return;
				}

				const result = await updateFacilityPricingRuleAction({
					storeId: String(params.storeId),
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
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
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
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("Edit_Pricing_Rule") : t("Create_Pricing_Rule")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("Edit_Pricing_Rule_Description")
							: t("Create_Pricing_Rule_Description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, (errors) => {
							const firstErrorKey = Object.keys(errors)[0];
							if (firstErrorKey) {
								const error = errors[firstErrorKey as keyof typeof errors];
								const errorMessage = error?.message;
								if (errorMessage) {
									toastError({
										title: t("Error"),
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
									<FormLabel>{t("Name")}</FormLabel>
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

						<FormItem>
							<FormLabel>{t("Facility")}</FormLabel>
							<FormControl>
								<FacilityCombobox
									storeId={String(params.storeId)}
									disabled={loading || form.formState.isSubmitting}
									defaultValue={selectedFacilityId || ""}
									onValueChange={(newValue) => {
										setSelectedFacilityId(newValue);
									}}
								/>
							</FormControl>
							<FormDescription>
								{t("Leave_empty_to_apply_to_all_facilities")}
							</FormDescription>
						</FormItem>

						<FormField
							control={form.control}
							name="priority"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("Priority")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : "0"
											}
											onChange={(event) =>
												field.onChange(Number(event.target.value))
											}
										/>
									</FormControl>
									<FormDescription>
										{t("Higher_priority_rules_are_evaluated_first")}
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
									<FormLabel>{t("Day_of_Week")}</FormLabel>
									<FormControl>
										<Input
											type="text"
											disabled={loading || form.formState.isSubmitting}
											placeholder='e.g., "weekend", "weekday", or [0,6]'
											value={field.value || ""}
											onChange={(event) =>
												field.onChange(event.target.value || null)
											}
										/>
									</FormControl>
									<FormDescription>
										{t("Leave_empty_for_all_days")}
									</FormDescription>
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
										<FormLabel>{t("Start_Time")}</FormLabel>
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
										<FormLabel>{t("End_Time")}</FormLabel>
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
										<FormLabel>{t("Cost")}</FormLabel>
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
										<FormDescription>
											{t("Leave_empty_to_use_facility_default")}
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
										<FormLabel>{t("Credit")}</FormLabel>
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
										<FormDescription>
											{t("Leave_empty_to_use_facility_default")}
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
										<FormLabel>{t("Active")}</FormLabel>
										<FormDescription>
											{t("Enable_or_disable_this_pricing_rule")}
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
