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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import BusinessHours from "@/lib/businessHours";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { createServiceStaffScheduleAction } from "@/actions/storeAdmin/serviceStaffSchedule/create-service-staff-schedule";
import {
	createServiceStaffScheduleSchema,
	updateServiceStaffScheduleSchema,
	type CreateServiceStaffScheduleInput,
} from "@/actions/storeAdmin/serviceStaffSchedule/service-staff-schedule.validation";
import { updateServiceStaffScheduleAction } from "@/actions/storeAdmin/serviceStaffSchedule/update-service-staff-schedule";

interface ScheduleItem {
	id: string;
	facilityId: string | null;
	facilityName: string | null;
	businessHours: string;
	isActive: boolean;
	priority: number;
	effectiveFrom: bigint | null;
	effectiveTo: bigint | null;
}

interface EditScheduleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	serviceStaffId: string;
	schedule: ScheduleItem | null;
	facilities: Array<{ id: string; facilityName: string }>;
	hasDefaultSchedule: boolean;
	onSaved: (schedule: ScheduleItem) => void;
}

// Default business hours template
const DEFAULT_BUSINESS_HOURS = JSON.stringify(
	{
		Monday: [{ from: "09:00", to: "18:00" }],
		Tuesday: [{ from: "09:00", to: "18:00" }],
		Wednesday: [{ from: "09:00", to: "18:00" }],
		Thursday: [{ from: "09:00", to: "18:00" }],
		Friday: [{ from: "09:00", to: "18:00" }],
		Saturday: "closed",
		Sunday: "closed",
		holidays: [],
		timeZone: "Asia/Taipei",
	},
	null,
	2,
);

type FormInput = CreateServiceStaffScheduleInput & { id?: string };

export function EditScheduleDialog({
	open,
	onOpenChange,
	serviceStaffId,
	schedule,
	facilities,
	hasDefaultSchedule,
	onSaved,
}: EditScheduleDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(schedule);

	const schema = useMemo(
		() =>
			isEditMode
				? updateServiceStaffScheduleSchema
				: createServiceStaffScheduleSchema,
		[isEditMode],
	);

	const defaultValues = useMemo(
		() =>
			schedule
				? {
						id: schedule.id,
						serviceStaffId,
						facilityId: schedule.facilityId,
						businessHours: schedule.businessHours,
						isActive: schedule.isActive,
						priority: schedule.priority,
						effectiveFrom: schedule.effectiveFrom
							? Number(schedule.effectiveFrom)
							: null,
						effectiveTo: schedule.effectiveTo
							? Number(schedule.effectiveTo)
							: null,
					}
				: {
						serviceStaffId,
						facilityId: null,
						businessHours: DEFAULT_BUSINESS_HOURS,
						isActive: true,
						priority: 0,
						effectiveFrom: null,
						effectiveTo: null,
					},
		[schedule, serviceStaffId],
	);

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
	});

	// Reset form when dialog opens/closes or schedule changes
	useEffect(() => {
		if (open) {
			form.reset(defaultValues);
		}
	}, [open, defaultValues, form]);

	const onSubmit = useCallback(
		async (values: FormInput) => {
			// Validate business hours JSON
			try {
				new BusinessHours(values.businessHours);
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: t("invalid_business_hours") || "Invalid business hours format",
				});
				return;
			}

			setLoading(true);
			try {
				if (isEditMode && values.id) {
					// Update existing schedule
					const result = await updateServiceStaffScheduleAction(
						String(params.storeId),
						{
							id: values.id,
							facilityId: values.facilityId || null,
							businessHours: values.businessHours,
							isActive: values.isActive,
							priority: values.priority,
							effectiveFrom: values.effectiveFrom,
							effectiveTo: values.effectiveTo,
						},
					);

					if (result?.serverError) {
						toastError({ description: result.serverError });
						return;
					}

					if (result?.data?.schedule) {
						onSaved({
							id: result.data.schedule.id,
							facilityId: result.data.schedule.facilityId,
							facilityName: result.data.schedule.Facility?.facilityName || null,
							businessHours: result.data.schedule.businessHours,
							isActive: result.data.schedule.isActive,
							priority: result.data.schedule.priority,
							effectiveFrom: result.data.schedule.effectiveFrom,
							effectiveTo: result.data.schedule.effectiveTo,
						});
						toastSuccess({
							description: t("schedule_updated") || "Schedule updated",
						});
					}
				} else {
					// Create new schedule
					const result = await createServiceStaffScheduleAction(
						String(params.storeId),
						{
							serviceStaffId,
							facilityId: values.facilityId || null,
							businessHours: values.businessHours,
							isActive: values.isActive,
							priority: values.priority,
							effectiveFrom: values.effectiveFrom,
							effectiveTo: values.effectiveTo,
						},
					);

					if (result?.serverError) {
						toastError({ description: result.serverError });
						return;
					}

					if (result?.data?.schedule) {
						onSaved({
							id: result.data.schedule.id,
							facilityId: result.data.schedule.facilityId,
							facilityName: result.data.schedule.Facility?.facilityName || null,
							businessHours: result.data.schedule.businessHours,
							isActive: result.data.schedule.isActive,
							priority: result.data.schedule.priority,
							effectiveFrom: result.data.schedule.effectiveFrom,
							effectiveTo: result.data.schedule.effectiveTo,
						});
						toastSuccess({
							description: t("schedule_created") || "Schedule created",
						});
					}
				}
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: t("error_saving_schedule") || "Failed to save schedule",
				});
			} finally {
				setLoading(false);
			}
		},
		[isEditMode, params.storeId, serviceStaffId, onSaved, t],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit_schedule") || "Edit Schedule"
							: t("create_schedule") || "Create Schedule"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("edit_schedule_description") || "Modify the facility schedule"
							: t("create_schedule_description") ||
								"Configure when this staff member is available"}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{/* Facility Selection */}
						<FormField
							control={form.control}
							name="facilityId"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>{t("facility") || "Facility"}</FormLabel>
									<Select
										value={field.value || "--"}
										onValueChange={(value) =>
											field.onChange(value === "--" ? null : value)
										}
										disabled={loading}
									>
										<FormControl>
											<SelectTrigger
												className={cn(
													"h-10 sm:h-9",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											>
												<SelectValue
													placeholder={
														t("select_facility") || "Select a facility"
													}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem
												value="--"
												disabled={hasDefaultSchedule && !isEditMode}
											>
												{t("default_all_facilities") ||
													"Default (All Facilities)"}
											</SelectItem>
											{facilities.map((facility) => (
												<SelectItem key={facility.id} value={facility.id}>
													{facility.facilityName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("facility_schedule_hint") ||
											"Leave as default to apply to all facilities without specific schedules"}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Business Hours */}
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
									<FormLabel>
										{t("business_hours") || "Business Hours"}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading}
											className={cn(
												"font-mono min-h-[200px] text-xs",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
											placeholder={DEFAULT_BUSINESS_HOURS}
											{...field}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("business_hours_format_hint") ||
											'JSON format with days, times, and timezone. Use "closed" for closed days.'}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Priority */}
						<FormField
							control={form.control}
							name="priority"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>{t("Priority") || "Priority"}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={loading}
											className={cn(
												"h-10 sm:h-9",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("priority_hint") ||
											"Higher priority schedules are evaluated first"}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Active Toggle */}
						<FormField
							control={form.control}
							name="isActive"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<FormLabel>{t("Active") || "Active"}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("active_schedule_hint") ||
												"Inactive schedules are ignored"}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						{/* Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_errors") || "Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => (
									<div
										key={field}
										className="text-sm text-destructive flex items-start gap-2"
									>
										<span className="font-medium">{field}:</span>
										<span>{error?.message as string}</span>
									</div>
								))}
							</div>
						)}

						<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={loading}
								className="w-full sm:w-auto h-10 sm:h-9 sm:min-h-0"
							>
								{t("Cancel") || "Cancel"}
							</Button>
							<Button
								type="submit"
								disabled={loading || !form.formState.isValid}
								className="w-full sm:w-auto h-10 sm:h-9 sm:min-h-0 disabled:opacity-25"
							>
								{loading
									? t("saving") || "Saving..."
									: isEditMode
										? t("update_schedule") || "Update"
										: t("create_schedule") || "Create"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
