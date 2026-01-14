"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { updateRsvpSettingsAction } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings";
import {
	updateRsvpSettingsSchema,
	type UpdateRsvpSettingsInput,
} from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpSettingsProps, type RsvpSettingsData } from "./tabs";
import { epochToDate } from "@/utils/datetime-utils";

type FormValues = Omit<UpdateRsvpSettingsInput, "storeId">;

interface RsvpSettingTabProps extends RsvpSettingsProps {
	onRsvpSettingsUpdated?: (updated: RsvpSettingsData) => void;
}

export const RsvpSettingTab: React.FC<RsvpSettingTabProps> = ({
	store,
	rsvpSettings,
	onStoreUpdated,
	onRsvpSettingsUpdated,
}) => {
	const params = useParams();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues: FormValues = useMemo(
		() =>
			rsvpSettings
				? {
						acceptReservation: rsvpSettings.acceptReservation,
						singleServiceMode: rsvpSettings.singleServiceMode ?? false,
						minPrepaidPercentage: rsvpSettings.minPrepaidPercentage ?? 100,
						noNeedToConfirm: rsvpSettings.noNeedToConfirm ?? false,
						canCancel: rsvpSettings.canCancel,
						cancelHours: rsvpSettings.cancelHours,
						canReserveBefore: rsvpSettings.canReserveBefore,
						canReserveAfter: rsvpSettings.canReserveAfter,
						defaultDuration: rsvpSettings.defaultDuration,
						requireSignature: rsvpSettings.requireSignature,
						showCostToCustomer: rsvpSettings.showCostToCustomer,
						mustSelectFacility: rsvpSettings.mustSelectFacility ?? false,
						mustHaveServiceStaff: rsvpSettings.mustHaveServiceStaff ?? false,
						useBusinessHours: rsvpSettings.useBusinessHours,
						rsvpHours: rsvpSettings.rsvpHours,
						reminderHours: rsvpSettings.reminderHours,
						useReminderSMS: rsvpSettings.useReminderSMS,
						useReminderLine: rsvpSettings.useReminderLine,
						useReminderEmail: rsvpSettings.useReminderEmail,
						syncWithGoogle: rsvpSettings.syncWithGoogle,
						syncWithApple: rsvpSettings.syncWithApple,
					}
				: {
						acceptReservation: true,
						singleServiceMode: false,
						minPrepaidPercentage: 100,
						noNeedToConfirm: false,
						canCancel: true,
						cancelHours: 24,
						canReserveBefore: 2,
						canReserveAfter: 2190,
						defaultDuration: 60,
						requireSignature: false,
						showCostToCustomer: true,
						mustSelectFacility: false,
						mustHaveServiceStaff: false,
						useBusinessHours: true,
						rsvpHours: null,
						reminderHours: 24,
						useReminderSMS: false,
						useReminderLine: true,
						useReminderEmail: true,
						syncWithGoogle: false,
						syncWithApple: false,
					},
		[rsvpSettings],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(updateRsvpSettingsSchema) as any,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	// Reset form when rsvpSettings changes (after update)
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: FormValues) => {
		try {
			setLoading(true);

			const payload: Omit<UpdateRsvpSettingsInput, "storeId"> = {
				...data,
			};

			const result = await updateRsvpSettingsAction(
				params.storeId as string,
				payload,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				// Update local state instead of refreshing router
				const rsvpSettings = result.data.rsvpSettings;
				const updatedRsvpSettings: RsvpSettingsData = {
					...rsvpSettings,
					minPrepaidPercentage: rsvpSettings.minPrepaidPercentage ?? 100,
					createdAt: epochToDate(rsvpSettings.createdAt) ?? new Date(),
					updatedAt: epochToDate(rsvpSettings.updatedAt) ?? new Date(),
				};

				// Notify parent to update state
				onRsvpSettingsUpdated?.(updatedRsvpSettings);

				toastSuccess({
					title: t("store_updated"),
					description: "",
				});
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardContent>
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
						className="space-y-6"
					>
						{/* Basic Settings */}
						<FormField
							control={form.control}
							name="acceptReservation"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>
											{t("store_settings_accept_reservation")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("store_settings_accept_reservation_descr")}
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

						<FormField
							control={form.control}
							name="singleServiceMode"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("rsvp_Single_Service_Mode")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_Single_Service_Mode_descr")}
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

						<FormField
							control={form.control}
							name="defaultDuration"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("rsvp_Default_Duration")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_Default_Duration_descr")}
										</FormDescription>
									</div>
									<FormControl>
										<Input
											type="number"
											disabled={loading || form.formState.isSubmitting}
											value={field.value?.toString() ?? ""}
											onChange={(event) =>
												field.onChange(Number(event.target.value))
											}
											className="w-24"
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="useBusinessHours"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("rsvp_Use_Business_Hours")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_Use_Business_Hours_descr")}
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

						{!form.watch("useBusinessHours") && (
							<FormField
								control={form.control}
								name="rsvpHours"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("rsvp_Hours")}</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono min-h-100"
												value={field.value ?? ""}
												onChange={(event) =>
													field.onChange(event.target.value || null)
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_Hours_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
							<FormField
								control={form.control}
								name="canReserveBefore"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("rsvp_can_Reserve_Before")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={field.value?.toString() ?? ""}
												onChange={(event) =>
													field.onChange(Number(event.target.value))
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_can_Reserve_Before_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="canReserveAfter"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("rsvp_can_Reserve_After")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={field.value?.toString() ?? ""}
												onChange={(event) =>
													field.onChange(Number(event.target.value))
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_can_Reserve_After_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
							<FormField
								control={form.control}
								name="mustSelectFacility"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>
												{t("rsvp_Must_Select_Facility") ||
													"Must Select Facility"}
											</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("rsvp_Must_Select_Facility_descr") ||
													"Customers must select a facility for their reservation"}
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
							<FormField
								control={form.control}
								name="mustHaveServiceStaff"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>
												{t("rsvp_can_Select_Service_Staff") ||
													"Must Have Service Staff"}
											</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("rsvp_can_Select_Service_Staff_descr") ||
													"Customers must select service staff (e.g., beautician, masseur, hairstylist, etc.)"}
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
						</div>
						<Separator />

						{/* Prepaid Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("rsvp_Prepaid_Settings")}
							</h3>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="minPrepaidPercentage"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("rsvp_Prepaid_Percentage")}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													max={100}
													step="1"
													disabled={loading || form.formState.isSubmitting}
													value={field.value?.toString() ?? "0"}
													onChange={(event) =>
														field.onChange(
															Number.isNaN(Number(event.target.value))
																? 0
																: Number(event.target.value),
														)
													}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("rsvp_Prepaid_Percentage_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="showCostToCustomer"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Show_Cost")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("rsvp_Show_Cost_descr")}
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
							</div>

							<FormField
								control={form.control}
								name="noNeedToConfirm"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("rsvp_No_Need_To_Confirm")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("rsvp_No_Need_To_Confirm_descr")}
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
						</div>

						<Separator />

						{/* Cancellation Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("rsvp_cancellation_Settings")}
							</h3>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="canCancel"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_can_Cancel")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("rsvp_can_Cancel_descr")}
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

								{form.watch("canCancel") && (
									<FormField
										control={form.control}
										name="cancelHours"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("rsvp_cancel_Hours")}</FormLabel>
												<FormControl>
													<Input
														type="number"
														disabled={loading || form.formState.isSubmitting}
														value={field.value?.toString() ?? ""}
														onChange={(event) =>
															field.onChange(Number(event.target.value))
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("rsvp_cancel_Hours_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>

							<FormField
								control={form.control}
								name="requireSignature"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("rsvp_Require_Signature")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("rsvp_Require_Signature_descr")}
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
						</div>

						<Separator />

						{/* Display & Signature Settings */}
						{/*
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("rsvp_Display_Settings")}
							</h3>
							
						</div>

						<Separator />
 */}
						{/* Reminder Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("rsvp_Reminder_Settings")}
							</h3>
							<FormField
								control={form.control}
								name="reminderHours"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("rsvp_Reminder_Hours")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={field.value?.toString() ?? ""}
												onChange={(event) =>
													field.onChange(Number(event.target.value))
												}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_Reminder_Hours_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-3 gap-1">
								<FormField
									control={form.control}
									name="useReminderEmail"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Reminder_Email")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
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
								<FormField
									control={form.control}
									name="useReminderSMS"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Reminder_SMS")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
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

								<FormField
									control={form.control}
									name="useReminderLine"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Reminder_Line")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
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
							</div>
						</div>

						{/* Calendar Sync Settings */}
						<div className="space-y-4">
							<div className="grid grid-flow-row-dense grid-cols-3 gap-1">
								<FormField
									control={form.control}
									name="syncWithGoogle"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Sync_Google")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
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

								<FormField
									control={form.control}
									name="syncWithApple"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("rsvp_Sync_Apple")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500"></FormDescription>
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
							</div>
						</div>

						{/* Validation Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									// Map field names to user-friendly labels using i18n
									const fieldLabels: Record<string, string> = {
										acceptReservation:
											t("RSVP_Accept_Reservation") || "Accept Reservation",
										singleServiceMode:
											t("RSVP_Single_Service_Mode") || "Single Service Mode",
										minPrepaidPercentage:
											t("RSVP_Min_Prepaid_Percentage") ||
											"Min Prepaid Percentage",
										noNeedToConfirm:
											t("RSVP_No_Need_To_Confirm") || "No Need To Confirm",
										canCancel: t("RSVP_Can_Cancel") || "Can Cancel",
										cancelHours: t("RSVP_Cancel_Hours") || "Cancel Hours",
										canReserveBefore:
											t("RSVP_Can_Reserve_Before") || "Can Reserve Before",
										canReserveAfter:
											t("RSVP_Can_Reserve_After") || "Can Reserve After",
										defaultDuration:
											t("RSVP_Default_Duration") || "Default Duration",
										requireSignature:
											t("RSVP_Require_Signature") || "Require Signature",
										showCostToCustomer:
											t("RSVP_Show_Cost_To_Customer") ||
											"Show Cost To Customer",
										mustSelectFacility:
											t("RSVP_Must_Select_Facility") || "Must Select Facility",
										mustHaveServiceStaff:
											t("RSVP_Must_Have_Service_Staff") ||
											"Must Have Service Staff",
										useBusinessHours:
											t("RSVP_Use_Business_Hours") || "Use Business Hours",
										rsvpHours: t("RSVP_Hours") || "RSVP Hours",
										reminderHours: t("RSVP_Reminder_Hours") || "Reminder Hours",
										useReminderSMS:
											t("RSVP_Use_Reminder_SMS") || "Use Reminder SMS",
										useReminderLine:
											t("RSVP_Use_Reminder_Line") || "Use Reminder Line",
										useReminderEmail:
											t("RSVP_Use_Reminder_Email") || "Use Reminder Email",
										syncWithGoogle:
											t("RSVP_Sync_With_Google") || "Sync With Google",
										syncWithApple:
											t("RSVP_Sync_With_Apple") || "Sync With Apple",
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

						<div className="flex space-x-2 pt-4">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{t("save")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset(defaultValues)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("cancel")}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
