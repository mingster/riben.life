/**
 * Register all channel adapters.
 * Import this module so adapters are registered before getChannelAdapter() is used.
 * QueueManager imports this so that RSVP/notification flows that never load index.ts
 * still have adapters registered.
 */

import { registerChannelAdapter } from "./channels";
import { OnSiteChannel } from "./channels/onsite-channel";
import { EmailChannel } from "./channels/email-channel";
import { LineChannel } from "./channels/line-channel";
import { WhatsAppChannel } from "./channels/whatsapp-channel";
import { WeChatChannel } from "./channels/wechat-channel";
import { SmsChannel } from "./channels/sms-channel";
import { TelegramChannel } from "./channels/telegram-channel";
import { PushChannel } from "./channels/push-channel";

registerChannelAdapter("onsite", new OnSiteChannel());
registerChannelAdapter("email", new EmailChannel());
registerChannelAdapter("line", new LineChannel());
registerChannelAdapter("whatsapp", new WhatsAppChannel());
registerChannelAdapter("wechat", new WeChatChannel());
registerChannelAdapter("sms", new SmsChannel());
registerChannelAdapter("telegram", new TelegramChannel());
registerChannelAdapter("push", new PushChannel());
