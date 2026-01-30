"use client";

import { getUserPreferencesAction } from "@/actions/user/notification/get-user-preferences";
import { updateUserPreferencesAction } from "@/actions/user/notification/update-user-preferences";
import {
	updateUserPreferencesSchema,
	type UpdateUserPreferencesInput,
} from "@/actions/user/notification/update-user-preferences.validation";
import { useTranslation } from "@/app/i18n/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
	NotificationPreferences,
	SystemNotificationSettings,
} from "@prisma/client";
import { IconBell, IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";

interface ClientUserPreferencesProps {
	systemSettings: SystemNotificationSettings | null;
}

const defaultPreferences: UpdateUserPreferencesInput = {
	storeId: null,
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

// SWR fetcher
const fetcher = async () => {
	const result = await getUserPreferencesAction();
	if (!result) {
		throw new Error("Failed to fetch preferences");
	}
	if (result.serverError) {
		throw new Error(result.serverError);
	}
	return result.data;
};

export function ClientUserPreferences({
	systemSettings,
}: ClientUserPreferencesProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const { data, error, mutate, isLoading } = useSWR(
		"user-notification-preferences",
		fetcher,
		{
			revalidateOnFocus: true,
		},
	);

	const globalPreferences = data?.globalPreferences;
	const storePreferences = data?.storePreferences || [];
	const stores = data?.stores || [];

	const [activeTab, setActiveTab] = useState<string>("global");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submittingStoreId, setSubmittingStoreId] = useState<string | null>(
		null,
	);

	// Get channel system status
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

	const availableChannels = useMemo(
		() =>
			[
				{ id: "onsite", label: t("onsite"), alwaysEnabled: true },
				{ id: "email", label: t("email"), alwaysEnabled: false },
				{ id: "line", label: t("line"), alwaysEnabled: false },
				{ id: "whatsapp", label: t("whatsapp"), alwaysEnabled: false },
				{ id: "wechat", label: t("wechat"), alwaysEnabled: false },
				{ id: "sms", label: t("sms"), alwaysEnabled: false },
				{ id: "telegram", label: t("telegram"), alwaysEnabled: false },
				{ id: "push", label: t("push"), alwaysEnabled: false },
			].filter(
				(channel) =>
					channel.alwaysEnabled || getChannelSystemStatus(channel.id),
			),
		[getChannelSystemStatus, t],
	);

	// Global preferences form
	const globalForm = useForm<UpdateUserPreferencesInput>({
		resolver: zodResolver(updateUserPreferencesSchema) as any,
		defaultValues: useMemo(() => {
			if (globalPreferences) {
				return {
					storeId: null,
					onSiteEnabled: globalPreferences.onSiteEnabled,
					emailEnabled: globalPreferences.emailEnabled,
					lineEnabled: globalPreferences.lineEnabled,
					whatsappEnabled: globalPreferences.whatsappEnabled,
					wechatEnabled: globalPreferences.wechatEnabled,
					smsEnabled: globalPreferences.smsEnabled,
					telegramEnabled: globalPreferences.telegramEnabled,
					pushEnabled: globalPreferences.pushEnabled,
					orderNotifications: globalPreferences.orderNotifications,
					reservationNotifications: globalPreferences.reservationNotifications,
					creditNotifications: globalPreferences.creditNotifications,
					paymentNotifications: globalPreferences.paymentNotifications,
					systemNotifications: globalPreferences.systemNotifications,
					marketingNotifications: globalPreferences.marketingNotifications,
					frequency: globalPreferences.frequency as
						| "immediate"
						| "daily_digest"
						| "weekly_digest",
				};
			}
			return defaultPreferences;
		}, [globalPreferences]),
	});

	// Reset global form when data changes
	useEffect(() => {
		if (globalPreferences) {
			globalForm.reset({
				storeId: null,
				onSiteEnabled: globalPreferences.onSiteEnabled,
				emailEnabled: globalPreferences.emailEnabled,
				lineEnabled: globalPreferences.lineEnabled,
				whatsappEnabled: globalPreferences.whatsappEnabled,
				wechatEnabled: globalPreferences.wechatEnabled,
				smsEnabled: globalPreferences.smsEnabled,
				telegramEnabled: globalPreferences.telegramEnabled,
				pushEnabled: globalPreferences.pushEnabled,
				orderNotifications: globalPreferences.orderNotifications,
				reservationNotifications: globalPreferences.reservationNotifications,
				creditNotifications: globalPreferences.creditNotifications,
				paymentNotifications: globalPreferences.paymentNotifications,
				systemNotifications: globalPreferences.systemNotifications,
				marketingNotifications: globalPreferences.marketingNotifications,
				frequency: globalPreferences.frequency as
					| "immediate"
					| "daily_digest"
					| "weekly_digest",
			});
		}
	}, [globalPreferences, globalForm]);

	// Handle global preferences submit
	const handleGlobalSubmit = useCallback(
		async (data: UpdateUserPreferencesInput) => {
			setIsSubmitting(true);
			try {
				const result = await updateUserPreferencesAction({
					...data,
					storeId: null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("preferences_saved_success"),
					});
					mutate(); // Refresh data
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
		[t, mutate],
	);

	// Handle store-specific preferences submit
	const handleStoreSubmit = useCallback(
		async (storeId: string, data: UpdateUserPreferencesInput) => {
			setSubmittingStoreId(storeId);
			try {
				const result = await updateUserPreferencesAction({
					...data,
					storeId,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("preferences_saved_success"),
					});
					mutate(); // Refresh data
				}
			} catch (error: any) {
				toastError({
					title: t("error_title"),
					description: error?.message || t("failed_to_save_preferences"),
				});
			} finally {
				setSubmittingStoreId(null);
			}
		},
		[t, mutate],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<IconLoader className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<p className="text-destructive">{t("failed_to_load_preferences")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Heading
					title={t("notification_preferences")}
					description={t("notification_center_description")}
				/>
				<Link href="/account/notifications/">
					<Button variant="outline" size="sm">
						<IconBell className="mr-2 h-4 w-4" />
						{t("notification_history")}
					</Button>
				</Link>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid grid-cols-4">
					<TabsTrigger value="global">{t("global_preferences")}</TabsTrigger>
					{stores.map((store) => (
						<TabsTrigger key={store.id} value={store.id}>
							{store.name}
						</TabsTrigger>
					))}
				</TabsList>

				{/* Global Preferences Tab */}
				<TabsContent value="global">
					<PreferencesForm
						form={globalForm}
						onSubmit={handleGlobalSubmit}
						isSubmitting={isSubmitting}
						availableChannels={availableChannels}
						t={t}
					/>
				</TabsContent>

				{/* Store-Specific Preferences Tabs */}
				{stores.map((store) => {
					const storePref =
						storePreferences.find((sp) => sp.storeId === store.id) || null;
					return (
						<TabsContent key={store.id} value={store.id}>
							<StorePreferencesForm
								store={store}
								storePreferences={storePref}
								onSubmit={(data) => handleStoreSubmit(store.id, data)}
								isSubmitting={submittingStoreId === store.id}
								availableChannels={availableChannels}
								t={t}
							/>
						</TabsContent>
					);
				})}
			</Tabs>
		</div>
	);
}

// Global Preferences Form Component
interface PreferencesFormProps {
	form: ReturnType<typeof useForm<UpdateUserPreferencesInput>>;
	onSubmit: (data: UpdateUserPreferencesInput) => Promise<void>;
	isSubmitting: boolean;
	availableChannels: Array<{
		id: string;
		label: string;
		alwaysEnabled: boolean;
	}>;
	t: (key: string) => string;
}

function PreferencesForm({
	form,
	onSubmit,
	isSubmitting,
	availableChannels,
	t,
}: PreferencesFormProps) {
	const notificationTypeLabels = useMemo(
		() => ({
			orderNotifications: t("order_notifications"),
			reservationNotifications: t("reservation_notifications"),
			creditNotifications: t("credit_notifications"),
			paymentNotifications: t("payment_notifications"),
			systemNotifications: t("system_notifications"),
			marketingNotifications: t("marketing_notifications"),
		}),
		[t],
	);

	const frequencyOptions = useMemo(
		() => [
			{ value: "immediate", label: t("immediate") },
			{ value: "daily_digest", label: t("daily_digest") },
			{ value: "weekly_digest", label: t("weekly_digest") },
		],
		[t],
	);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Channel Preferences */}
				<Card>
					<CardHeader>
						<CardTitle>{t("channel_preferences")}</CardTitle>
						<CardDescription>
							{t("channel_preferences_description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-row flex-wrap gap-4">
						{availableChannels.map((channel) => {
							const fieldNameMap: Record<
								string,
								keyof UpdateUserPreferencesInput
							> = {
								onsite: "onSiteEnabled",
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
													disabled={isSubmitting || channel.alwaysEnabled}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{channel.label}</FormLabel>
												{channel.alwaysEnabled && (
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("always_enabled")}
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

				{/* Notification Type Preferences */}
				<Card>
					<CardHeader>
						<CardTitle>{t("notification_type_preferences")}</CardTitle>
						<CardDescription>
							{t("notification_type_preferences_description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-row flex-wrap gap-4">
						{Object.entries(notificationTypeLabels).map(([key, label]) => {
							const fieldName = key as keyof UpdateUserPreferencesInput;
							return (
								<FormField
									key={key}
									control={form.control}
									name={fieldName}
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value as boolean}
													onCheckedChange={field.onChange}
													disabled={isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{label}</FormLabel>
											</div>
										</FormItem>
									)}
								/>
							);
						})}
					</CardContent>
				</Card>

				{/* Frequency */}
				<Card>
					<CardHeader>
						<CardTitle>{t("frequency")}</CardTitle>
						<CardDescription>{t("frequency_description")}</CardDescription>
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
											disabled={isSubmitting}
										>
											{frequencyOptions.map((option) => (
												<FormItem
													key={option.value}
													className="flex items-center space-x-3 space-y-0"
												>
													<FormControl>
														<RadioGroupItem value={option.value} />
													</FormControl>
													<FormLabel className="font-normal">
														{option.label}
													</FormLabel>
												</FormItem>
											))}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex gap-4">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("saving")}
							</>
						) : (
							t("save_preferences")
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}

// Store-Specific Preferences Form Component
interface StorePreferencesFormProps {
	store: { id: string; name: string | null };
	storePreferences:
		| (NotificationPreferences & {
				Store?: { id: string; name: string | null } | null;
		  })
		| null;
	onSubmit: (data: UpdateUserPreferencesInput) => Promise<void>;
	isSubmitting: boolean;
	availableChannels: Array<{
		id: string;
		label: string;
		alwaysEnabled: boolean;
	}>;
	t: (key: string) => string;
}

function StorePreferencesForm({
	store,
	storePreferences,
	onSubmit,
	isSubmitting,
	availableChannels,
	t,
}: StorePreferencesFormProps) {
	const defaultValues = useMemo(() => {
		if (storePreferences) {
			return {
				storeId: store.id,
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
		return { ...defaultPreferences, storeId: store.id };
	}, [storePreferences, store.id]);

	const form = useForm<UpdateUserPreferencesInput>({
		resolver: zodResolver(updateUserPreferencesSchema) as any,
		defaultValues,
	});

	// Reset form when preferences change
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const notificationTypeLabels = useMemo(
		() => ({
			orderNotifications: t("order_notifications"),
			reservationNotifications: t("reservation_notifications"),
			creditNotifications: t("credit_notifications"),
			paymentNotifications: t("payment_notifications"),
			systemNotifications: t("system_notifications"),
			marketingNotifications: t("marketing_notifications"),
		}),
		[t],
	);

	const frequencyOptions = useMemo(
		() => [
			{ value: "immediate", label: t("immediate") },
			{ value: "daily_digest", label: t("daily_digest") },
			{ value: "weekly_digest", label: t("weekly_digest") },
		],
		[t],
	);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>{store.name || store.id}</CardTitle>
					<CardDescription>
						{t("store_specific_preferences_description")}
					</CardDescription>
				</CardHeader>
			</Card>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Channel Preferences */}
					<Card>
						<CardHeader>
							<CardTitle>{t("channel_preferences")}</CardTitle>
							<CardDescription>
								{t("channel_preferences_description")}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-row flex-wrap gap-4">
							{availableChannels.map((channel) => {
								const fieldNameMap: Record<
									string,
									keyof UpdateUserPreferencesInput
								> = {
									onsite: "onSiteEnabled",
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
														disabled={isSubmitting || channel.alwaysEnabled}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>{channel.label}</FormLabel>
													{channel.alwaysEnabled && (
														<FormDescription className="text-xs font-mono text-gray-500">
															{t("always_enabled")}
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

					{/* Notification Type Preferences */}
					<Card>
						<CardHeader>
							<CardTitle>{t("notification_type_preferences")}</CardTitle>
							<CardDescription>
								{t("notification_type_preferences_description")}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-row flex-wrap gap-4">
							{Object.entries(notificationTypeLabels).map(([key, label]) => {
								const fieldName = key as keyof UpdateUserPreferencesInput;
								return (
									<FormField
										key={key}
										control={form.control}
										name={fieldName}
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value as boolean}
														onCheckedChange={field.onChange}
														disabled={isSubmitting}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>{label}</FormLabel>
												</div>
											</FormItem>
										)}
									/>
								);
							})}
						</CardContent>
					</Card>

					{/* Frequency */}
					<Card>
						<CardHeader>
							<CardTitle>{t("frequency")}</CardTitle>
							<CardDescription>{t("frequency_description")}</CardDescription>
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
												disabled={isSubmitting}
											>
												{frequencyOptions.map((option) => (
													<FormItem
														key={option.value}
														className="flex items-center space-x-3 space-y-0"
													>
														<FormControl>
															<RadioGroupItem value={option.value} />
														</FormControl>
														<FormLabel className="font-normal">
															{option.label}
														</FormLabel>
													</FormItem>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									{t("saving")}
								</>
							) : (
								t("save_preferences")
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
