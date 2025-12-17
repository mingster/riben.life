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
import { useState } from "react";
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
		}
	>;
}

type ChannelFormData = {
	channel: string;
	enabled: boolean;
	credentials: Record<string, string>;
};

const PLUGIN_CHANNELS = [
	{
		id: "line",
		name: "LINE Messaging",
		description: "Send notifications via LINE Messaging API",
		credentialFields: [
			{ key: "channelId", label: "Channel ID" },
			{ key: "channelSecret", label: "Channel Secret" },
			{ key: "accessToken", label: "Access Token" },
		],
	},
	{
		id: "whatsapp",
		name: "WhatsApp Business",
		description: "Send notifications via WhatsApp Business API",
		credentialFields: [
			{ key: "phoneNumberId", label: "Phone Number ID" },
			{ key: "accessToken", label: "Access Token" },
			{ key: "businessAccountId", label: "Business Account ID" },
		],
	},
	{
		id: "wechat",
		name: "WeChat Official Account",
		description: "Send notifications via WeChat Official Account API",
		credentialFields: [
			{ key: "appId", label: "App ID" },
			{ key: "appSecret", label: "App Secret" },
			{ key: "accessToken", label: "Access Token" },
		],
	},
	{
		id: "sms",
		name: "SMS",
		description: "Send notifications via SMS",
		credentialFields: [
			{ key: "apiKey", label: "API Key" },
			{ key: "apiSecret", label: "API Secret" },
			{ key: "fromNumber", label: "From Number" },
		],
	},
	{
		id: "telegram",
		name: "Telegram Bot",
		description: "Send notifications via Telegram Bot API",
		credentialFields: [
			{ key: "botToken", label: "Bot Token" },
			{ key: "chatId", label: "Chat ID" },
		],
	},
	{
		id: "push",
		name: "Push Notifications",
		description: "Send push notifications to mobile devices",
		credentialFields: [
			{ key: "fcmServerKey", label: "FCM Server Key" },
			{ key: "apnsKeyId", label: "APNs Key ID" },
			{ key: "apnsTeamId", label: "APNs Team ID" },
			{ key: "apnsBundleId", label: "APNs Bundle ID" },
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
		if (!systemSettings) return false;
		switch (channelId) {
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
					description: `${PLUGIN_CHANNELS.find((c) => c.id === channelId)?.name} settings saved`,
				});
			}
		} catch (error) {
			toastError({
				description: "Failed to save settings",
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
				description: "Connection test not yet implemented",
			});
		}, 1000);
	};

	return (
		<div className="space-y-6">
			{/* Built-in Channels */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-medium">Built-in Channels</h3>
					<p className="text-sm text-muted-foreground">
						These channels are always available and cannot be disabled
					</p>
				</div>

				{/* On-Site Notifications */}
				<div className="rounded-lg border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								On-Site Notifications
							</label>
							<p className="text-sm text-muted-foreground">
								Built-in - Always Available. Cannot be disabled - core
								functionality.
							</p>
						</div>
						<Badge variant="outline" className=" text-green-700">
							Always Enabled
						</Badge>
					</div>
				</div>

				{/* Email Notifications */}
				<div className="rounded-lg border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Email Notifications
							</label>
							<p className="text-sm text-muted-foreground">
								Built-in - Always Available. Cannot be disabled - uses system
								SMTP configuration.
							</p>
						</div>
						<Badge variant="outline" className=" text-green-700">
							Always Enabled
						</Badge>
					</div>
				</div>
			</div>

			<Separator />

			{/* Plugin Channels */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-medium">Plugin Channels</h3>
					<p className="text-sm text-muted-foreground">
						Enable and configure external notification channel plugins. Plugins
						must be enabled by System Admin first.
					</p>
				</div>

				{PLUGIN_CHANNELS.map((channel) => {
					const systemEnabled = getSystemStatus(channel.id);
					const config = channelConfigs.get(channel.id);
					const isEnabled = config?.enabled ?? false;
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

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="rounded-lg border p-4 space-y-4">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								{channel.name} (Plugin)
							</label>
							<p className="text-sm text-muted-foreground">
								{channel.description}
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
								? "Enabled by System Admin"
								: "Disabled by System Admin"}
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
										Enabled (Store-level)
									</FormLabel>
									<FormDescription>
										{systemEnabled
											? "Enable this channel for your store"
											: "Plugin must be enabled by System Admin first"}
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
							<div className="text-sm font-medium">Credentials</div>
							{channel.credentialFields.map((field) => {
								const fieldName = `credentials.${field.key}` as const;
								return (
									<FormField
										key={field.key}
										control={form.control}
										name={fieldName}
										render={({ field: formField }) => (
											<FormItem>
												<FormLabel>{field.label}</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder={`Enter ${field.label.toLowerCase()}`}
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
							<Button type="submit" disabled={saving || loading}>
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
							Note: Plugin must be enabled by System Admin first
						</p>
					)}
				</div>
			</form>
		</Form>
	);
}
