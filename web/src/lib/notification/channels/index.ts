/**
 * Channel Adapters
 * Unified interface for different notification channels
 */

import type {
	NotificationChannel,
	ChannelConfig,
	ValidationResult,
	DeliveryStatusInfo,
} from "../types";
import type { Notification } from "../types";

export interface NotificationChannelAdapter {
	name: NotificationChannel;
	send(
		notification: Notification,
		config: ChannelConfig,
	): Promise<{
		success: boolean;
		channel: NotificationChannel;
		messageId?: string;
		error?: string;
		deliveredAt?: bigint;
	}>;
	validateConfig(config: ChannelConfig): ValidationResult;
	getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo>;
	isEnabled(storeId: string): Promise<boolean>;
}

// Channel adapter registry
const channelAdapters = new Map<
	NotificationChannel,
	NotificationChannelAdapter
>();

/**
 * Register a channel adapter
 */
export function registerChannelAdapter(
	channel: NotificationChannel,
	adapter: NotificationChannelAdapter,
): void {
	channelAdapters.set(channel, adapter);
}

/**
 * Get channel adapter
 */
export function getChannelAdapter(
	channel: NotificationChannel,
): NotificationChannelAdapter | undefined {
	return channelAdapters.get(channel);
}

/**
 * Get all registered channel adapters
 */
export function getAllChannelAdapters(): NotificationChannelAdapter[] {
	return Array.from(channelAdapters.values());
}

// Export channel implementations
export { OnSiteChannel } from "./onsite-channel";
export { EmailChannel } from "./email-channel";
export { LineChannel } from "./line-channel";
export { WhatsAppChannel } from "./whatsapp-channel";
export { WeChatChannel } from "./wechat-channel";
export { SmsChannel } from "./sms-channel";
export { TelegramChannel } from "./telegram-channel";
export { PushChannel } from "./push-channel";
