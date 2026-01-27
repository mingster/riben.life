import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { isPro } from "@/lib/store-admin-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotificationSettingsClient } from "./components/client-settings";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// only allow store level = PRO or above to access this page
export default async function NotificationSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Check if store has PRO level or above
	const hasProLevel = await isPro(params.storeId);
	if (!hasProLevel) {
		redirect(`/storeAdmin/${params.storeId}/subscribe`);
	}

	// Get store (access check already done in layout)
	const storeResult = await getStoreWithRelations(params.storeId, {});

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch system notification settings (to check plugin status)
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	// Fetch all channel configs for this store
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: {
			storeId: params.storeId,
		},
	});

	// Map credential field keys to environment variable names
	const envVarMap: Record<string, Record<string, string>> = {
		line: {
			channelId: "LINE_MESSAGE_API_ID",
			channelSecret: "LINE_MESSAGE_API_SECRET",
			accessToken: "LINE_MESSAGE_CHANNEL_ACCESS_TOKEN",
		},
		whatsapp: {
			phoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
			accessToken: "WHATSAPP_ACCESS_TOKEN",
			businessAccountId: "WHATSAPP_BUSINESS_ACCOUNT_ID",
		},
		wechat: {
			appId: "WECHAT_APP_ID",
			appSecret: "WECHAT_APP_SECRET",
			accessToken: "WECHAT_ACCESS_TOKEN",
		},
		sms: {
			accountSid: "TWILIO_ACCOUNT_SID",
			authToken: "TWILIO_AUTH_TOKEN",
			fromNumber: "TWILIO_PHONE_NUMBER",
		},
		telegram: {
			botToken: "TELEGRAM_BOT_TOKEN",
			chatId: "TELEGRAM_CHAT_ID",
		},
		push: {
			fcmServerKey: "FCM_SERVER_KEY",
			apnsKeyId: "APNS_KEY_ID",
			apnsTeamId: "APNS_TEAM_ID",
			apnsBundleId: "APNS_BUNDLE_ID",
		},
	};

	// Helper function to merge credentials with env var defaults
	const mergeCredentialsWithDefaults = (
		channel: string,
		storedCredentials: Record<string, any> | null,
	): Record<string, string> => {
		const envVars = envVarMap[channel] || {};
		const merged: Record<string, string> = {};

		// For each credential field, use stored value if available, otherwise use env var
		Object.entries(envVars).forEach(([key, envVarName]) => {
			const envValue = process.env[envVarName];
			merged[key] = storedCredentials?.[key] || envValue || "";
		});

		return merged;
	};

	// Helper function to check if a channel is enabled system-wide
	const isChannelEnabledSystemWide = (channel: string): boolean => {
		if (!systemSettings) return false;

		switch (channel) {
			case "line":
				return systemSettings.lineEnabled ?? false;
			case "whatsapp":
				return systemSettings.whatsappEnabled ?? false;
			case "wechat":
				return systemSettings.wechatEnabled ?? false;
			case "sms":
				return systemSettings.smsEnabled ?? false;
			case "telegram":
				return systemSettings.telegramEnabled ?? false;
			case "push":
				return systemSettings.pushEnabled ?? false;
			default:
				return false;
		}
	};

	// Filter channel configs to only include system-wide enabled channels
	const enabledChannelConfigs = channelConfigs.filter((config) =>
		isChannelEnabledSystemWide(config.channel),
	);

	// Create a map of channel -> config for easy lookup
	const configMap = new Map(
		enabledChannelConfigs.map((config) => {
			const storedCredentials = config.credentials
				? JSON.parse(config.credentials)
				: null;

			return [
				config.channel,
				{
					...config,
					// Parse JSON credentials and settings, merging with env var defaults
					credentials: mergeCredentialsWithDefaults(
						config.channel,
						storedCredentials,
					),
					settings: config.settings ? JSON.parse(config.settings) : null,
				},
			];
		}),
	);

	// For channels without configs, create entries with env vars as defaults
	// Only include channels that are enabled system-wide
	const allChannels = ["line", "whatsapp", "wechat", "sms", "telegram", "push"];
	const enabledChannels = allChannels.filter((channel) =>
		isChannelEnabledSystemWide(channel),
	);

	for (const channel of enabledChannels) {
		if (!configMap.has(channel)) {
			const defaultCredentials = mergeCredentialsWithDefaults(channel, null);
			configMap.set(channel, {
				id: "",
				storeId: params.storeId,
				channel,
				enabled: false,
				createdAt: BigInt(0),
				updatedAt: BigInt(0),
				credentials: defaultCredentials,
				settings: null,
			});
		}
	}

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<NotificationSettingsClient
					storeId={params.storeId}
					systemSettings={systemSettings}
					channelConfigs={configMap}
				/>
			</Container>
		</Suspense>
	);
}
