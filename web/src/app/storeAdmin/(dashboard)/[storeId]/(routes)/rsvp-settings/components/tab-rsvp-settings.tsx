"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
						prepaidRequired: rsvpSettings.prepaidRequired,
					minPrepaidAmount:
						rsvpSettings.minPrepaidAmount !== null
							? Number(rsvpSettings.minPrepaidAmount)
								: null,
						canCancel: rsvpSettings.canCancel,
						cancelHours: rsvpSettings.cancelHours,
						defaultDuration: rsvpSettings.defaultDuration,
						requireSignature: rsvpSettings.requireSignature,
						showCostToCustomer: rsvpSettings.showCostToCustomer,
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
						prepaidRequired: false,
					minPrepaidAmount: null,
						canCancel: true,
						cancelHours: 24,
						defaultDuration: 60,
						requireSignature: false,
						showCostToCustomer: false,
						useBusinessHours: true,
						rsvpHours: null,
						reminderHours: 24,
						useReminderSMS: false,
						useReminderLine: false,
						useReminderEmail: false,
						syncWithGoogle: false,
						syncWithApple: false,
					},
		[rsvpSettings],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(
			updateRsvpSettingsSchema.omit({ storeId: true }),
		) as any,
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

			const payload: UpdateRsvpSettingsInput = {
				storeId: params.storeId as string,
				...data,
			};

			const result = await updateRsvpSettingsAction(payload);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				// Update local state instead of refreshing router
				const updatedRsvpSettings = result.data
					.rsvpSettings as RsvpSettingsData;
				/*
				const updatedRsvpSettings: RsvpSettingsData = {
					id: result.data.rsvpSettings.id,
					storeId: result.data.rsvpSettings.storeId,
					acceptReservation: result.data.rsvpSettings.acceptReservation,
					prepaidRequired: result.data.rsvpSettings.prepaidRequired,
					minPrepaidAmount: result.data.rsvpSettings.minPrepaidAmount
						? Number(result.data.rsvpSettings.minPrepaidAmount)
						: null,
					canCancel: result.data.rsvpSettings.canCancel,
					cancelHours: Number(result.data.rsvpSettings.cancelHours),
					defaultDuration: Number(result.data.rsvpSettings.defaultDuration),
					requireSignature: result.data.rsvpSettings.requireSignature,
					showCostToCustomer: result.data.rsvpSettings.showCostToCustomer,
					useBusinessHours: result.data.rsvpSettings.useBusinessHours,
					rsvpHours: result.data.rsvpSettings.rsvpHours,
					reminderHours: Number(result.data.rsvpSettings.reminderHours),
					useReminderSMS: result.data.rsvpSettings.useReminderSMS,
					useReminderLine: result.data.rsvpSettings.useReminderLine,
					useReminderEmail: result.data.rsvpSettings.useReminderEmail,
					syncWithGoogle: result.data.rsvpSettings.syncWithGoogle,
					syncWithApple: result.data.rsvpSettings.syncWithApple,
					createdAt: result.data.rsvpSettings.createdAt,
					updatedAt: result.data.rsvpSettings.updatedAt,
				};
				*/

				// Notify parent to update state
				onRsvpSettingsUpdated?.(updatedRsvpSettings);

				toastSuccess({
					title: t("Store_updated"),
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
											{t("StoreSettings_acceptReservation")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("StoreSettings_acceptReservation_descr")}
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
								<FormItem>
									<FormLabel>{t("RSVP_Default_Duration")}</FormLabel>
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
										{t("RSVP_Default_Duration_descr")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="useBusinessHours"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("RSVP_Use_Business_Hours")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("RSVP_Use_Business_Hours_descr")}
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
										<FormLabel>{t("RSVP_Hours")}</FormLabel>
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
											{t("RSVP_Hours_descr")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<Separator />

						{/* Prepaid Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("RSVP_Prepaid_Settings")}
							</h3>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="prepaidRequired"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Prepaid_Required")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("RSVP_Prepaid_Required_descr")}
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

								{form.watch("prepaidRequired") && (
									<FormField
										control={form.control}
										name="minPrepaidAmount"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("RSVP_Prepaid_Amount")}</FormLabel>
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
															field.onChange(
																value === "" ? null : Number(value),
															);
														}}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("RSVP_Prepaid_Amount_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						</div>

						<Separator />

						{/* Cancellation Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("RSVP_Cancellation_Settings")}
							</h3>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="canCancel"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Can_Cancel")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("RSVP_Can_Cancel_descr")}
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
												<FormLabel>{t("RSVP_Cancel_Hours")}</FormLabel>
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
													{t("RSVP_Cancel_Hours_descr")}
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
									<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("RSVP_Require_Signature")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("RSVP_Require_Signature_descr")}
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
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("RSVP_Display_Settings")}
							</h3>
							<FormField
								control={form.control}
								name="showCostToCustomer"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>{t("RSVP_Show_Cost")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("RSVP_Show_Cost_descr")}
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

						{/* Reminder Settings */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("RSVP_Reminder_Settings")}
							</h3>
							<FormField
								control={form.control}
								name="reminderHours"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("RSVP_Reminder_Hours")}</FormLabel>
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
											{t("RSVP_Reminder_Hours_descr")}
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
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Reminder_Email")}</FormLabel>
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
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Reminder_SMS")}</FormLabel>
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
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Reminder_Line")}</FormLabel>
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
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Sync_Google")}</FormLabel>
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
										<FormItem className="flex flex-row items-center gap-2 pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("RSVP_Sync_Apple")}</FormLabel>
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
