/**
 * Notification System
 * Main entry point for the notification system
 */

export * from "./types";
export * from "./notification-service";
export * from "./queue-manager";
export * from "./preference-manager";
export * from "./delivery-tracker";
export * from "./template-engine";
export * from "./realtime-service";
export * from "./channels";

// Export singleton instances
export { notificationService } from "./notification-service";
export { realtimeService } from "./realtime-service";

// Initialize channel adapters
import { registerChannelAdapter } from "./channels";
import { OnSiteChannel } from "./channels/onsite-channel";
import { EmailChannel } from "./channels/email-channel";
import { LineChannel } from "./channels/line-channel";
import { WhatsAppChannel } from "./channels/whatsapp-channel";
import { WeChatChannel } from "./channels/wechat-channel";
import { SmsChannel } from "./channels/sms-channel";
import { TelegramChannel } from "./channels/telegram-channel";
import { PushChannel } from "./channels/push-channel";

// Register all channel adapters
registerChannelAdapter("onsite", new OnSiteChannel());
registerChannelAdapter("email", new EmailChannel());
registerChannelAdapter("line", new LineChannel());
registerChannelAdapter("whatsapp", new WhatsAppChannel());
registerChannelAdapter("wechat", new WeChatChannel());
registerChannelAdapter("sms", new SmsChannel());
registerChannelAdapter("telegram", new TelegramChannel());
registerChannelAdapter("push", new PushChannel());
