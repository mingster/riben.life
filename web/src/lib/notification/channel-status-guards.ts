import type { DeliveryStatus, NotificationChannel } from "./types";

const NOTIFICATION_CHANNELS = [
	"onsite",
	"email",
	"line",
	"whatsapp",
	"wechat",
	"sms",
	"telegram",
	"push",
] as const satisfies readonly NotificationChannel[];

const DELIVERY_STATUSES = [
	"pending",
	"sent",
	"delivered",
	"read",
	"failed",
	"bounced",
] as const satisfies readonly DeliveryStatus[];

/**
 * Runtime guard for DB/string values mapped to notification channels.
 */
export function isNotificationChannel(
	value: string,
): value is NotificationChannel {
	return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/**
 * Runtime guard for delivery status strings.
 */
export function isDeliveryStatus(value: string): value is DeliveryStatus {
	return (DELIVERY_STATUSES as readonly string[]).includes(value);
}
