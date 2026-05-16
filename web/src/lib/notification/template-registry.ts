import type { NotificationChannel } from "./types";
import {
	LIFECYCLE_CHANNELS,
	LIFECYCLE_RECIPIENTS,
	ORDER_LIFECYCLE_EVENTS,
	RESERVATION_LIFECYCLE_EVENTS,
	SUBSCRIPTION_LIFECYCLE_EVENTS,
	type LifecycleDomain,
	type LifecycleEvent,
	type LifecycleRecipient,
	type OrderLifecycleEvent,
	type ReservationLifecycleEvent,
	type SubscriptionLifecycleEvent,
} from "./lifecycle-events";

export interface LifecycleDescriptor {
	domain: LifecycleDomain;
	event: LifecycleEvent;
	recipient: LifecycleRecipient;
	channel: NotificationChannel;
}

export interface TemplateCoverageRecord {
	templateName: string;
	locale: string;
}

export interface MissingLifecycleTemplate {
	templateName: string;
	locale: string;
}

export function buildLifecycleTemplateKey(input: LifecycleDescriptor): string {
	return `${input.domain}.${input.event}.${input.recipient}.${input.channel}`;
}

export function parseLifecycleTemplateKey(
	templateName: string,
): LifecycleDescriptor | null {
	const chunks = templateName.split(".");
	if (chunks.length !== 4) return null;

	const [domain, event, recipient, channel] = chunks as [
		string,
		string,
		string,
		NotificationChannel,
	];

	if (
		domain !== "order" &&
		domain !== "reservation" &&
		domain !== "subscription"
	)
		return null;
	if (!LIFECYCLE_RECIPIENTS.includes(recipient as LifecycleRecipient)) {
		return null;
	}
	if (!LIFECYCLE_CHANNELS.includes(channel)) return null;

	if (domain === "order") {
		if (!ORDER_LIFECYCLE_EVENTS.includes(event as OrderLifecycleEvent))
			return null;
	} else if (domain === "reservation") {
		if (
			!RESERVATION_LIFECYCLE_EVENTS.includes(event as ReservationLifecycleEvent)
		) {
			return null;
		}
	} else if (
		!SUBSCRIPTION_LIFECYCLE_EVENTS.includes(event as SubscriptionLifecycleEvent)
	) {
		return null;
	}

	// Subscription notifications are customer-facing only (no store staff templates).
	if (domain === "subscription" && recipient === "staff") {
		return null;
	}

	// Staff deleted notifications use fallback copy only (no lifecycle templates).
	if (
		domain === "reservation" &&
		event === "deleted" &&
		recipient === "staff"
	) {
		return null;
	}

	// Store confirmation is customer-facing only (no staff lifecycle templates).
	if (
		domain === "reservation" &&
		event === "confirmed_by_store" &&
		recipient === "staff"
	) {
		return null;
	}

	// Staff payment-received notifications use fallback copy only (no lifecycle templates).
	if (
		(domain === "reservation" || domain === "order") &&
		event === "payment_received" &&
		recipient === "staff"
	) {
		return null;
	}

	// Ready-to-confirm is staff-facing only (no customer lifecycle templates).
	if (
		domain === "reservation" &&
		event === "ready_to_confirm" &&
		recipient === "customer"
	) {
		return null;
	}

	// Ready is customer-facing only (no staff lifecycle templates).
	if (domain === "reservation" && event === "ready" && recipient === "staff") {
		return null;
	}

	// Checked-in is staff-facing only (no customer lifecycle templates).
	if (
		domain === "reservation" &&
		event === "checked_in" &&
		recipient === "customer"
	) {
		return null;
	}

	// Completed and credit top-up completed are customer-facing only (no staff lifecycle templates).
	if (
		(domain === "reservation" || domain === "order") &&
		event === "completed" &&
		recipient === "staff"
	) {
		return null;
	}

	if (
		domain === "order" &&
		event === "credit_topup_completed" &&
		recipient === "staff"
	) {
		return null;
	}

	// No-show staff notifications use fallback copy only (no lifecycle templates).
	if (
		domain === "reservation" &&
		event === "no_show" &&
		recipient === "staff"
	) {
		return null;
	}

	// Customer confirm required uses fallback copy only (no lifecycle templates).
	if (domain === "reservation" && event === "customer_confirm_required") {
		return null;
	}

	// Customer order payment-received notifications use fallback copy only.
	if (
		domain === "order" &&
		event === "payment_received" &&
		recipient === "customer"
	) {
		return null;
	}

	// unpaid_order_created is internal only (no customer/staff lifecycle templates).
	if (event === "unpaid_order_created") {
		return null;
	}

	return {
		domain,
		event: event as LifecycleEvent,
		recipient: recipient as LifecycleRecipient,
		channel,
	};
}

export function getLifecycleTemplateCatalog(): LifecycleDescriptor[] {
	const orderEntries = ORDER_LIFECYCLE_EVENTS.flatMap((event) =>
		LIFECYCLE_RECIPIENTS.flatMap((recipient) => {
			if (event === "payment_received" && recipient === "customer") {
				return [];
			}
			if (event === "payment_received" && recipient === "staff") {
				return [];
			}
			if (event === "completed" && recipient === "staff") {
				return [];
			}
			if (event === "credit_topup_completed" && recipient === "staff") {
				return [];
			}

			return LIFECYCLE_CHANNELS.map((channel) => ({
				domain: "order" as const,
				event,
				recipient,
				channel,
			}));
		}),
	);

	const reservationEntries = RESERVATION_LIFECYCLE_EVENTS.flatMap((event) =>
		LIFECYCLE_RECIPIENTS.flatMap((recipient) => {
			if (event === "deleted" && recipient === "staff") {
				return [];
			}
			if (event === "confirmed_by_store" && recipient === "staff") {
				return [];
			}
			if (event === "payment_received" && recipient === "staff") {
				return [];
			}
			if (event === "ready_to_confirm" && recipient === "customer") {
				return [];
			}
			if (event === "ready" && recipient === "staff") {
				return [];
			}
			if (event === "checked_in" && recipient === "customer") {
				return [];
			}
			if (event === "completed" && recipient === "staff") {
				return [];
			}
			if (event === "no_show" && recipient === "staff") {
				return [];
			}
			if (event === "customer_confirm_required") {
				return [];
			}
			if (event === "unpaid_order_created") {
				return [];
			}

			return LIFECYCLE_CHANNELS.map((channel) => ({
				domain: "reservation" as const,
				event,
				recipient,
				channel,
			}));
		}),
	);

	const subscriptionEntries = SUBSCRIPTION_LIFECYCLE_EVENTS.flatMap((event) =>
		LIFECYCLE_CHANNELS.map((channel) => ({
			domain: "subscription" as const,
			event,
			recipient: "customer" as const,
			channel,
		})),
	);

	return [...orderEntries, ...reservationEntries, ...subscriptionEntries];
}

export function getLifecycleTemplateNames(): string[] {
	return getLifecycleTemplateCatalog().map((entry) =>
		buildLifecycleTemplateKey(entry),
	);
}

export function validateLifecycleTemplateCoverage(input: {
	requiredLocales: string[];
	records: TemplateCoverageRecord[];
}): MissingLifecycleTemplate[] {
	const existing = new Set(
		input.records.map(
			(record) => `${record.templateName}__${record.locale.toLowerCase()}`,
		),
	);

	const missing: MissingLifecycleTemplate[] = [];

	for (const templateName of getLifecycleTemplateNames()) {
		for (const locale of input.requiredLocales) {
			const key = `${templateName}__${locale.toLowerCase()}`;
			if (!existing.has(key)) {
				missing.push({ templateName, locale });
			}
		}
	}

	return missing;
}
