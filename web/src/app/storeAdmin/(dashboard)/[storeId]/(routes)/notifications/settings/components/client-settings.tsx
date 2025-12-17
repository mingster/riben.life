"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import { ChannelConfigForm } from "./channel-config-form";
import type { SystemNotificationSettings } from "@prisma/client";

interface NotificationSettingsClientProps {
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

export function NotificationSettingsClient({
	storeId,
	systemSettings,
	channelConfigs,
}: NotificationSettingsClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div className="space-y-6">
			<Heading
				title={t("notification_settings")}
				description={t("notification_settings_descr")}
			/>
			<Separator />
			<ChannelConfigForm
				storeId={storeId}
				systemSettings={systemSettings}
				channelConfigs={channelConfigs}
			/>
		</div>
	);
}
