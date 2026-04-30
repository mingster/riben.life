import type { NotificationChannel } from "./types";
import {
	LIFECYCLE_CHANNELS,
	LIFECYCLE_RECIPIENTS,
	ORDER_LIFECYCLE_EVENTS,
	RESERVATION_LIFECYCLE_EVENTS,
	type LifecycleDomain,
	type LifecycleEvent,
	type LifecycleRecipient,
	type OrderLifecycleEvent,
	type ReservationLifecycleEvent,
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

	if (domain !== "order" && domain !== "reservation") return null;
	if (!LIFECYCLE_RECIPIENTS.includes(recipient as LifecycleRecipient)) {
		return null;
	}
	if (!LIFECYCLE_CHANNELS.includes(channel)) return null;

	if (domain === "order") {
		if (!ORDER_LIFECYCLE_EVENTS.includes(event as OrderLifecycleEvent))
			return null;
	} else if (
		!RESERVATION_LIFECYCLE_EVENTS.includes(event as ReservationLifecycleEvent)
	) {
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
		LIFECYCLE_RECIPIENTS.flatMap((recipient) =>
			LIFECYCLE_CHANNELS.map((channel) => ({
				domain: "order" as const,
				event,
				recipient,
				channel,
			})),
		),
	);

	const reservationEntries = RESERVATION_LIFECYCLE_EVENTS.flatMap((event) =>
		LIFECYCLE_RECIPIENTS.flatMap((recipient) =>
			LIFECYCLE_CHANNELS.map((channel) => ({
				domain: "reservation" as const,
				event,
				recipient,
				channel,
			})),
		),
	);

	return [...orderEntries, ...reservationEntries];
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
