"use client";

import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSystemNotificationSettingsAction } from "@/actions/sysAdmin/notification/update-system-settings";
import {
	type UpdateSystemNotificationSettingsInput,
	updateSystemNotificationSettingsSchema,
} from "@/actions/sysAdmin/notification/update-system-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { toastError, toastSuccess } from "@/components/toaster";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import { SettingsForm } from "./settings-form";
import type { SystemNotificationSettings } from "@prisma/client";

interface ClientNotificationSettingsProps {
	initialSettings: SystemNotificationSettings;
}

export function ClientNotificationSettings({
	initialSettings,
}: ClientNotificationSettingsProps) {
	const [settings, setSettings] =
		useState<SystemNotificationSettings>(initialSettings);
	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues = {
		id: settings.id,
		notificationsEnabled: settings.notificationsEnabled,
		emailEnabled: settings.emailEnabled ?? true,
		lineEnabled: settings.lineEnabled ?? false,
		whatsappEnabled: settings.whatsappEnabled ?? false,
		wechatEnabled: settings.wechatEnabled ?? false,
		smsEnabled: settings.smsEnabled ?? false,
		telegramEnabled: settings.telegramEnabled ?? false,
		pushEnabled: settings.pushEnabled ?? false,
		maxRetryAttempts: settings.maxRetryAttempts,
		retryBackoffMs: settings.retryBackoffMs,
		queueBatchSize: settings.queueBatchSize,
		rateLimitPerMinute: settings.rateLimitPerMinute,
		historyRetentionDays: settings.historyRetentionDays,
	};

	const form = useForm<UpdateSystemNotificationSettingsInput>({
		resolver: zodResolver(
			updateSystemNotificationSettingsSchema,
		) as Resolver<UpdateSystemNotificationSettingsInput>,
		defaultValues,
		mode: "onChange",
	});

	const handleSettingsUpdated = (updated: SystemNotificationSettings) => {
		setSettings(updated);
	};

	async function onSubmit(data: UpdateSystemNotificationSettingsInput) {
		setLoading(true);
		const result = await updateSystemNotificationSettingsAction(data);
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else if (result?.data) {
			const updatedSettings = result.data as SystemNotificationSettings;
			handleSettingsUpdated(updatedSettings);
			toastSuccess({ description: "System notification settings updated!" });
		}
		setLoading(false);
	}

	return (
		<div className="space-y-6">
			<Heading
				title="System Notification Settings"
				description="Configure system-wide notification settings and queue management"
			/>
			<Separator />
			<SettingsForm form={form} onSubmit={onSubmit} loading={loading} />
		</div>
	);
}
