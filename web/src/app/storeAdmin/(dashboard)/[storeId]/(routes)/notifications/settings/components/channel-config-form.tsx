"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { updateChannelConfigAction } from "@/actions/storeAdmin/notification/update-channel-config";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import type { SystemNotificationSettings } from "@prisma/client";
import { IconLoader } from "@tabler/icons-react";
import { Loader } from "@/components/loader";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface ChannelConfigFormProps {
	storeId: string;
	systemSettings: SystemNotificationSettings | null;
	channelConfigs: Map<
		string,
		{
			id: string;
			storeId: string;
			channel: string;
			enabled: boolean;
			credentials: Record<string, any> | null;
			settings: Record<string, any> | null;
			createdAt?: bigint;
			updatedAt?: bigint;
		}
	>;
}

type ChannelFormData = {
	channel: string;
	enabled: boolean;
	credentials: Record<string, string>;
};

// Channel definitions - names and descriptions will be translated via i18n
const PLUGIN_CHANNELS = [
	{
		id: "line",
		credentialFields: [
			{ key: "channelId", labelKey: "channel_config_line_channel_id" },
			{ key: "channelSecret", labelKey: "channel_config_line_channel_secret" },
			{ key: "accessToken", labelKey: "channel_config_access_token" },
		],
	},
	{
		id: "whatsapp",
		credentialFields: [
			{
				key: "phoneNumberId",
				labelKey: "channel_config_whatsapp_phone_number_id",
			},
			{ key: "accessToken", labelKey: "channel_config_access_token" },
			{
				key: "businessAccountId",
				labelKey: "channel_config_whatsapp_business_account_id",
			},
		],
	},
	{
		id: "wechat",
		credentialFields: [
			{ key: "appId", labelKey: "channel_config_wechat_app_id" },
			{ key: "appSecret", labelKey: "channel_config_wechat_app_secret" },
			{ key: "accessToken", labelKey: "channel_config_access_token" },
		],
	},
	{
		id: "sms",
		credentialFields: [
			{ key: "accountSid", labelKey: "channel_config_sms_api_key" },
			{ key: "authToken", labelKey: "channel_config_sms_api_secret" },
			{ key: "fromNumber", labelKey: "channel_config_sms_from_number" },
		],
	},
	{
		id: "telegram",
		credentialFields: [
			{ key: "botToken", labelKey: "channel_config_telegram_bot_token" },
			{ key: "chatId", labelKey: "channel_config_telegram_chat_id" },
		],
	},
	{
		id: "push",
		credentialFields: [
			{ key: "fcmServerKey", labelKey: "channel_config_push_fcm_server_key" },
			{ key: "apnsKeyId", labelKey: "channel_config_push_apns_key_id" },
			{ key: "apnsTeamId", labelKey: "channel_config_push_apns_team_id" },
			{ key: "apnsBundleId", labelKey: "channel_config_push_apns_bundle_id" },
		],
	},
] as const;

export function ChannelConfigForm({
	storeId,
	systemSettings,
	channelConfigs,
}: ChannelConfigFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState<Record<string, boolean>>({});
	const [saving, setSaving] = useState<Record<string, boolean>>({});

	const getSystemStatus = (channelId: string): boolean => {
		if (!systemSettings) return channelId === "email";
		switch (channelId) {
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
	};

	const handleSave = async (channelId: string, data: ChannelFormData) => {
		setSaving((prev) => ({ ...prev, [channelId]: true }));
		try {
			const result = await updateChannelConfigAction(storeId, {
				storeId,
				channel: channelId as any,
				enabled: data.enabled,
				credentials: data.credentials,
				settings: {},
			});

			if (result?.serverError) {
				toastError({ description: result.serverError });
			} else {
				toastSuccess({
					description:
						t(`channel_config_${channelId}_name`) +
						" " +
						t("channel_config_settings_saved"),
				});
			}
		} catch (error) {
			toastError({
				description: t("channel_config_save_failed"),
			});
		} finally {
			setSaving((prev) => ({ ...prev, [channelId]: false }));
		}
	};

	const handleTestConnection = async (channelId: string) => {
		setLoading((prev) => ({ ...prev, [channelId]: true }));
		// TODO: Implement test connection logic
		setTimeout(() => {
			setLoading((prev) => ({ ...prev, [channelId]: false }));
			toastSuccess({
				description: t("channel_config_test_not_implemented"),
			});
		}, 1000);
	};

	return (
		<div className="space-y-6">
			{/* Built-in Channels */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-medium">
						{t("channel_config_built_in_channels")}
					</h3>
					<p className="text-sm text-muted-foreground">
						{t("channel_config_built_in_channels_descr")}
					</p>
				</div>

				{/* On-Site Notifications */}
				<div className="rounded-lg border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								{t("channel_config_onsite_notifications")}
							</label>
							<p className="text-sm text-muted-foreground">
								{t("channel_config_onsite_notifications_descr")}
							</p>
						</div>
						<Badge variant="outline" className=" text-green-700">
							{t("channel_config_always_enabled")}
						</Badge>
					</div>
				</div>

				{/* Email Notifications (toggle when system has email enabled) */}
				{channelConfigs.has("email") && (
					<EmailChannelToggle
						initialEnabled={channelConfigs.get("email")?.enabled ?? true}
						onSave={(enabled) =>
							handleSave("email", {
								channel: "email",
								enabled,
								credentials: {},
							})
						}
						saving={saving["email"] ?? false}
						t={t}
					/>
				)}
			</div>

			<Separator />

			{/* Plugin Channels (email is in Built-in above when system allows) */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-medium">
						{t("channel_config_plugin_channels")}
					</h3>
					<p className="text-sm text-muted-foreground">
						{t("channel_config_plugin_channels_descr")}
					</p>
				</div>

				{PLUGIN_CHANNELS.filter((channel) => {
					// Only show channels that are enabled system-wide (exist in channelConfigs)
					return channelConfigs.has(channel.id);
				}).map((channel) => {
					const systemEnabled = getSystemStatus(channel.id);
					const config = channelConfigs.get(channel.id);
					const isEnabled = config?.enabled ?? false;
					// Use config credentials if available, otherwise empty object
					// (env vars will be used as defaults when saving)
					const credentials = config?.credentials ?? {};

					return (
						<ChannelConfigSection
							key={channel.id}
							channel={channel}
							systemEnabled={systemEnabled}
							initialEnabled={isEnabled}
							initialCredentials={credentials}
							onSave={(data) => handleSave(channel.id, data)}
							onTestConnection={() => handleTestConnection(channel.id)}
							loading={loading[channel.id] ?? false}
							saving={saving[channel.id] ?? false}
						/>
					);
				})}
			</div>
		</div>
	);
}

interface ChannelConfigSectionProps {
	channel: (typeof PLUGIN_CHANNELS)[number];
	systemEnabled: boolean;
	initialEnabled: boolean;
	initialCredentials: Record<string, string>;
	onSave: (data: ChannelFormData) => Promise<void>;
	onTestConnection: () => Promise<void>;
	loading: boolean;
	saving: boolean;
}

function ChannelConfigSection({
	channel,
	systemEnabled,
	initialEnabled,
	initialCredentials,
	onSave,
	onTestConnection,
	loading,
	saving,
}: ChannelConfigSectionProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const form = useForm<ChannelFormData>({
		defaultValues: {
			channel: channel.id,
			enabled: initialEnabled,
			credentials: initialCredentials || {},
		},
	});

	const onSubmit = async (data: ChannelFormData) => {
		await onSave(data);
	};

	const isSubmitting = saving || form.formState.isSubmitting;

	return (
		<div className="relative">
			{isSubmitting && (
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
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="rounded-lg border p-4 space-y-4">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									{t(`channel_config_${channel.id}_name`)} (
									{t("channel_config_plugin")})
								</label>
								<p className="text-sm text-muted-foreground">
									{t(`channel_config_${channel.id}_descr`)}
								</p>
							</div>
							<Badge
								variant={systemEnabled ? "default" : "secondary"}
								className={
									systemEnabled
										? "bg-blue-50 text-blue-700"
										: "bg-gray-50 text-gray-700"
								}
							>
								{systemEnabled
									? t("channel_config_enabled_by_system_admin")
									: t("channel_config_disabled_by_system_admin")}
							</Badge>
						</div>

						{/* Enable Toggle */}
						<FormField
							control={form.control}
							name="enabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											{t("channel_config_enabled_store_level")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{systemEnabled
												? t("channel_config_enable_for_store")
												: t("channel_config_plugin_must_be_enabled_first")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value && systemEnabled}
											onCheckedChange={field.onChange}
											disabled={!systemEnabled || saving}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						{/* Credentials Fields */}
						{systemEnabled && (
							<div className="space-y-3">
								<div className="text-sm font-medium">
									{t("channel_config_credentials")}
								</div>
								{channel.credentialFields.map((field) => {
									const fieldName = `credentials.${field.key}` as const;
									return (
										<FormField
											key={field.key}
											control={form.control}
											name={fieldName}
											render={({ field: formField }) => (
												<FormItem>
													<FormLabel>{t(field.labelKey)}</FormLabel>
													<FormControl>
														<Input
															type="password"
															placeholder={
																t("channel_config_enter") +
																" " +
																t(field.labelKey).toLowerCase()
															}
															{...formField}
															value={String(formField.value || "")}
															onChange={(e) => {
																const currentCredentials =
																	form.getValues("credentials") || {};
																form.setValue("credentials", {
																	...currentCredentials,
																	[field.key]: e.target.value,
																});
															}}
															disabled={saving}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									);
								})}
							</div>
						)}

						{/* Actions */}
						{systemEnabled && (
							<div className="flex items-center gap-2 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={onTestConnection}
									disabled={loading || saving}
								>
									{loading ? (
										<>
											<IconLoader className="mr-2 h-4 w-4 animate-spin" />
											{t("testing")}
										</>
									) : (
										t("test_connection")
									)}
								</Button>

								{/* Validation Error Summary */}
								{Object.keys(form.formState.errors).length > 0 && (
									<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
										<div className="text-sm font-semibold text-destructive">
											{t("please_fix_validation_errors") ||
												"Please fix the following errors:"}
										</div>
										{Object.entries(form.formState.errors).map(
											([field, error]) => {
												// Map field names to user-friendly labels
												const fieldLabel = field || "Field";
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

								<Button
									type="submit"
									disabled={
										saving ||
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{saving ? (
										<>
											<IconLoader className="mr-2 h-4 w-4 animate-spin" />
											{t("saving")}
										</>
									) : (
										t("save_settings")
									)}
								</Button>
							</div>
						)}

						{!systemEnabled && (
							<p className="text-sm text-muted-foreground">
								{t("channel_config_note_plugin_must_be_enabled")}
							</p>
						)}
					</div>
				</form>
			</Form>
		</div>
	);
}

interface EmailChannelToggleProps {
	initialEnabled: boolean;
	onSave: (enabled: boolean) => Promise<void>;
	saving: boolean;
	t: (key: string) => string;
}

function EmailChannelToggle({
	initialEnabled,
	onSave,
	saving,
	t,
}: EmailChannelToggleProps) {
	const [enabled, setEnabled] = useState(initialEnabled);

	useEffect(() => {
		setEnabled(initialEnabled);
	}, [initialEnabled]);

	const handleCheckedChange = async (checked: boolean) => {
		setEnabled(checked);
		await onSave(checked);
	};

	return (
		<div className="rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						{t("channel_config_email_notifications")}
					</label>
					<p className="text-sm text-muted-foreground">
						{t("channel_config_email_notifications_descr")}
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={handleCheckedChange}
					disabled={saving}
				/>
			</div>
		</div>
	);
}
