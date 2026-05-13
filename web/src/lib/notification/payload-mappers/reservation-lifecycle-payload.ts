import type { RsvpNotificationContext } from "@/lib/notification/rsvp-notification-router";
import type { NotificationLocale } from "@/lib/notification/rsvp-notification-router";
import { translateRsvpStatusForNotification } from "@/lib/notification/translate-rsvp-status-for-notification";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

export interface ReservationLifecycleOrderData {
	orderNumber: number | null;
	createdOn: bigint | null;
	updatedAt: bigint | null;
	total: string;
}

export interface ReservationLifecyclePayloadInput {
	context: RsvpNotificationContext;
	locale: NotificationLocale;
	storeName?: string | null;
	order?: ReservationLifecycleOrderData | null;
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

	const orderCreatedDate =
		input.order?.createdOn != null ? epochToDate(input.order.createdOn) : null;
	const orderCreatedOn = orderCreatedDate
		? formatDateTime(orderCreatedDate)
		: "";
	const orderUpdatedDate =
		input.order?.updatedAt != null ? epochToDate(input.order.updatedAt) : null;
	const orderUpdatedAt = orderUpdatedDate
		? formatDateTime(orderUpdatedDate)
		: "";

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
			status: translateRsvpStatusForNotification(
				input.locale,
				input.context.status,
			),
			previousStatus: translateRsvpStatusForNotification(
				input.locale,
				input.context.previousStatus,
			),
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
			paymentAmount: input.context.paymentAmount ?? "",
			paymentCurrency: input.context.paymentCurrency ?? "",
			refundAmount: input.context.refundAmount ?? "",
			refundCurrency: input.context.refundCurrency ?? "",
		},
		order: {
			orderNumber: input.order?.orderNumber ?? "",
			createdOn: orderCreatedOn,
			updatedAt: orderUpdatedAt,
			total: input.order?.total ?? "",
		},
	};
}
