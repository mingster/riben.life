"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
	NotificationPreferences,
	SystemNotificationSettings,
} from "@prisma/client";
import { IconLoader } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { updateStorePreferencesAction } from "@/actions/storeAdmin/notification/update-store-preferences";
import {
	type UpdateStorePreferencesInput,
	updateStorePreferencesSchema,
} from "@/actions/storeAdmin/notification/update-store-preferences.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { Heading } from "@/components/heading";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";

interface ClientPreferencesProps {
	storeId: string;
	storePreferences: NotificationPreferences | null;
	systemSettings: SystemNotificationSettings | null;
}

const defaultPreferences: UpdateStorePreferencesInput = {
	onSiteEnabled: true,
	emailEnabled: true,
	lineEnabled: false,
	whatsappEnabled: false,
	wechatEnabled: false,
	smsEnabled: false,
	telegramEnabled: false,
	pushEnabled: false,
	orderNotifications: true,
	reservationNotifications: true,
	creditNotifications: true,
	paymentNotifications: true,
	systemNotifications: true,
	marketingNotifications: false,
	frequency: "immediate",
};

export function ClientPreferences({
	storeId,
	storePreferences,
	systemSettings,
}: ClientPreferencesProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [isSubmitting, setIsSubmitting] = useState(false);

	const defaultValues = useMemo(() => {
		if (storePreferences) {
			return {
				onSiteEnabled: storePreferences.onSiteEnabled,
				emailEnabled: storePreferences.emailEnabled,
				lineEnabled: storePreferences.lineEnabled,
				whatsappEnabled: storePreferences.whatsappEnabled,
				wechatEnabled: storePreferences.wechatEnabled,
				smsEnabled: storePreferences.smsEnabled,
				telegramEnabled: storePreferences.telegramEnabled,
				pushEnabled: storePreferences.pushEnabled,
				orderNotifications: storePreferences.orderNotifications,
				reservationNotifications: storePreferences.reservationNotifications,
				creditNotifications: storePreferences.creditNotifications,
				paymentNotifications: storePreferences.paymentNotifications,
				systemNotifications: storePreferences.systemNotifications,
				marketingNotifications: storePreferences.marketingNotifications,
				frequency: storePreferences.frequency as
					| "immediate"
					| "daily_digest"
					| "weekly_digest",
			};
		}
		return defaultPreferences;
	}, [storePreferences]);

	const form = useForm<UpdateStorePreferencesInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateStorePreferencesSchema,
		) as Resolver<UpdateStorePreferencesInput>,
		defaultValues,
	});

	const getChannelSystemStatus = useCallback(
		(channelId: string) => {
			if (!systemSettings)
				return channelId === "onsite" || channelId === "email";
			switch (channelId) {
				case "onsite":
					return true; // On-site is always system-enabled
				case "email":
					return systemSettings.emailEnabled !== false;
				case "line":
					return systemSettings.lineEnabled;
				case "whatsapp":
					return systemSettings.whatsappEnabled;
				case "wechat":
					return systemSettings.wechatEnabled;
				case "sms":
					return systemSettings.smsEnabled;
				case "telegram":
					return systemSettings.telegramEnabled;
				case "push":
					return systemSettings.pushEnabled;
				default:
					return false;
			}
		},
		[systemSettings],
	);

	const availableChannels = [
		{ id: "onsite", label: t("onsite"), alwaysEnabled: true },
		{ id: "email", label: t("email"), alwaysEnabled: false },
		{ id: "line", label: t("line"), alwaysEnabled: false },
		{ id: "whatsapp", label: t("whatsapp"), alwaysEnabled: false },
		{ id: "wechat", label: t("wechat"), alwaysEnabled: false },
		{ id: "sms", label: t("sms"), alwaysEnabled: false },
		{ id: "telegram", label: t("telegram"), alwaysEnabled: false },
		{ id: "push", label: t("push"), alwaysEnabled: false },
	].filter(
		(channel) => channel.alwaysEnabled || getChannelSystemStatus(channel.id),
	);

	const onSubmit = useCallback(
		async (data: UpdateStorePreferencesInput) => {
			setIsSubmitting(true);
			try {
				const result = await updateStorePreferencesAction(storeId, data);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("preferences_saved_success"),
					});
				}
			} catch (error: any) {
				toastError({
					title: t("error_title"),
					description: error?.message || t("failed_to_save_preferences"),
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, t],
	);

	return (
		<div className="space-y-6">
			<Heading
				title={t("store_notification_preferences")}
				description={t("store_notification_preferences_descr")}
			/>
			<Separator />

			<div className="relative">
				<FormSubmitOverlay
					visible={isSubmitting}
					statusText={t("submitting")}
				/>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
						aria-busy={isSubmitting}
					>
						{/* Default Channel Preferences */}
						<Card>
							<CardHeader>
								<CardTitle>{t("default_channel_preferences")}</CardTitle>
								<CardDescription>
									{t("default_channel_preferences_descr")}
								</CardDescription>
							</CardHeader>
							<CardContent className="grid grid-cols-4 gap-4">
								<FormField
									control={form.control}
									name="onSiteEnabled"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={true} // On-site is always enabled
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("onsite")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("onsite_always_enabled")}
												</FormDescription>
											</div>
										</FormItem>
									)}
								/>

								{availableChannels
									.filter((ch) => !ch.alwaysEnabled)
									.map((channel) => {
										// Map channel ID to field name
										const fieldNameMap: Record<
											string,
											keyof UpdateStorePreferencesInput
										> = {
											email: "emailEnabled",
											line: "lineEnabled",
											whatsapp: "whatsappEnabled",
											wechat: "wechatEnabled",
											sms: "smsEnabled",
											telegram: "telegramEnabled",
											push: "pushEnabled",
										};
										const fieldName = fieldNameMap[channel.id];
										if (!fieldName) return null;

										const systemEnabled = getChannelSystemStatus(channel.id);
										return (
											<FormField
												key={channel.id}
												control={form.control}
												name={fieldName}
												render={({ field }) => (
													<FormItem className="flex flex-row items-start space-x-3 space-y-0">
														<FormControl>
															<Checkbox
																checked={field.value as boolean}
																onCheckedChange={field.onChange}
																disabled={isSubmitting || !systemEnabled}
															/>
														</FormControl>
														<div className="space-y-1 leading-none">
															<FormLabel>{channel.label}</FormLabel>
															{!systemEnabled && (
																<FormDescription className="text-xs font-mono text-gray-500">
																	{t("channel_config_disabled_by_system_admin")}
																</FormDescription>
															)}
														</div>
													</FormItem>
												)}
											/>
										);
									})}
							</CardContent>
						</Card>

						{/* Default Notification Type Preferences */}
						<Card>
							<CardHeader>
								<CardTitle>
									{t("default_notification_type_preferences")}
								</CardTitle>
								<CardDescription>
									{t("default_notification_type_preferences_descr")}
								</CardDescription>
							</CardHeader>
							<CardContent className="grid grid-cols-4 gap-4">
								<FormField
									control={form.control}
									name="orderNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("order_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="reservationNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("reservation_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="creditNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("credit_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="paymentNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("payment_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="systemNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("system_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="marketingNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("marketing_notifications")}</FormLabel>
											</div>
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>

						{/* Default Frequency */}
						<Card>
							<CardHeader>
								<CardTitle>{t("default_frequency")}</CardTitle>
								<CardDescription>
									{t("default_frequency_descr")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormField
									control={form.control}
									name="frequency"
									render={({ field }) => (
										<FormItem className="space-y-3">
											<FormControl>
												<RadioGroup
													onValueChange={field.onChange}
													value={field.value}
													className="flex flex-row space-y-1"
												>
													<FormItem className="flex items-center space-x-3 space-y-0">
														<FormControl>
															<RadioGroupItem value="immediate" />
														</FormControl>
														<FormLabel className="font-normal">
															{t("immediate")}
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-3 space-y-0">
														<FormControl>
															<RadioGroupItem value="daily_digest" />
														</FormControl>
														<FormLabel className="font-normal">
															{t("daily_digest")}
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-3 space-y-0">
														<FormControl>
															<RadioGroupItem value="weekly_digest" />
														</FormControl>
														<FormLabel className="font-normal">
															{t("weekly_digest")}
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>

						{/* Actions */}
						<AdminSettingsTabFormFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset(defaultValues)}
								disabled={isSubmitting}
								className="touch-manipulation"
							>
								{t("reset")}
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="touch-manipulation"
							>
								{isSubmitting ? (
									<>
										<IconLoader className="mr-2 h-4 w-4 animate-spin" />
										{t("saving")}
									</>
								) : (
									t("save_preferences")
								)}
							</Button>
						</AdminSettingsTabFormFooter>
					</form>
				</Form>
			</div>
		</div>
	);
}
