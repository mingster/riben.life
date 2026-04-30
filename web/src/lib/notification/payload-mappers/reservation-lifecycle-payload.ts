import type { RsvpNotificationContext } from "@/lib/notification/rsvp-notification-router";
import type { NotificationLocale } from "@/lib/notification/rsvp-notification-router";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

export interface ReservationLifecyclePayloadInput {
	context: RsvpNotificationContext;
	locale: NotificationLocale;
	storeName?: string | null;
}

export function buildReservationLifecyclePayload(
	input: ReservationLifecyclePayloadInput,
): Record<string, unknown> {
	const rsvpDate = input.context.rsvpTime
		? epochToDate(input.context.rsvpTime)
		: null;
	const arriveDate = input.context.arriveTime
		? epochToDate(input.context.arriveTime)
		: null;

	return {
		locale: input.locale,
		customer: {
			id: input.context.customerId ?? "",
			name: input.context.customerName ?? "",
			email: input.context.customerEmail ?? "",
			phone: input.context.customerPhone ?? "",
		},
		store: {
			id: input.context.storeId,
			name: input.storeName ?? input.context.storeName ?? "",
		},
		reservation: {
			id: input.context.rsvpId,
			status: input.context.status ?? null,
			previousStatus: input.context.previousStatus ?? null,
			dateTime: rsvpDate ? formatDateTime(rsvpDate) : "",
			arriveTime: arriveDate ? formatDateTime(arriveDate) : "",
			facilityName: input.context.facilityName ?? "",
			serviceStaffName: input.context.serviceStaffName ?? "",
			numOfAdult: input.context.numOfAdult ?? 0,
			numOfChild: input.context.numOfChild ?? 0,
			message: input.context.message ?? "",
			checkInCode: input.context.checkInCode ?? "",
			actionUrl: input.context.actionUrl ?? "",
			orderId: input.context.orderId ?? "",
			paymentAmount: input.context.paymentAmount ?? null,
			paymentCurrency: input.context.paymentCurrency ?? "",
			refundAmount: input.context.refundAmount ?? null,
			refundCurrency: input.context.refundCurrency ?? "",
		},
	};
}
