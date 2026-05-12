import type { NotificationChannel } from "./types";

export const LIFECYCLE_RECIPIENTS = ["customer", "staff"] as const;
export type LifecycleRecipient = (typeof LIFECYCLE_RECIPIENTS)[number];

export const ORDER_LIFECYCLE_EVENTS = [
	"payment_received",
	"paid",
	"cancelled",
	"refunded",
	"completed",
	"credit_topup_completed",
] as const;
export type OrderLifecycleEvent = (typeof ORDER_LIFECYCLE_EVENTS)[number];

export const RESERVATION_LIFECYCLE_EVENTS = [
	"created",
	"unpaid_order_created",
	"updated",
	"cancelled",
	"deleted",
	"confirmed_by_store",
	"confirmed_by_customer",
	"payment_received",
	"ready_to_confirm",
	"ready",
	"checked_in",
	"completed",
	"no_show",
	"reminder",
	"customer_confirm_required",
] as const;
export type ReservationLifecycleEvent =
	(typeof RESERVATION_LIFECYCLE_EVENTS)[number];

/** Store/platform subscription lifecycle (distinct from order line items). */
export const SUBSCRIPTION_LIFECYCLE_EVENTS = ["created", "cancelled"] as const;
export type SubscriptionLifecycleEvent =
	(typeof SUBSCRIPTION_LIFECYCLE_EVENTS)[number];

export const LIFECYCLE_CHANNELS: readonly NotificationChannel[] = [
	"email",
	"onsite",
	"line",
	"whatsapp",
	"wechat",
	"sms",
	"telegram",
	"push",
] as const;

export type LifecycleDomain = "order" | "reservation" | "subscription";
export type LifecycleEvent =
	| OrderLifecycleEvent
	| ReservationLifecycleEvent
	| SubscriptionLifecycleEvent;

export interface LifecycleTemplateDescriptor {
	domain: LifecycleDomain;
	event: LifecycleEvent;
	recipient: LifecycleRecipient;
	channel: NotificationChannel;
}
