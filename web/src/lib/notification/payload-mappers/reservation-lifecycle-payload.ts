import type { RsvpNotificationContext } from "@/lib/notification/rsvp-notification-router";
import type { NotificationLocale } from "@/lib/notification/rsvp-notification-router";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";
import { getNotificationT } from "@/lib/notification/notification-i18n";
import { RsvpStatus } from "@/types/enum";

const STATUS_I18N_KEYS: Record<number, string> = {
	[RsvpStatus.Pending]: "notif_status_pending",
	[RsvpStatus.ReadyToConfirm]: "notif_status_ready_to_confirm",
	[RsvpStatus.Ready]: "notif_status_ready",
	[RsvpStatus.ConfirmedByCustomer]: "notif_status_confirmed_by_customer",
	[RsvpStatus.CheckedIn]: "notif_status_checked_in",
	[RsvpStatus.Completed]: "notif_status_completed",
	[RsvpStatus.Cancelled]: "notif_status_cancelled",
	[RsvpStatus.NoShow]: "notif_status_no_show",
};

export interface ReservationLifecycleOrderData {
	orderNumber: number | null;
	createdOn: bigint | null;
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

	const t = getNotificationT(input.locale);
	const translateStatus = (status: number | undefined | null): string => {
		if (status == null) return "";
		const key = STATUS_I18N_KEYS[status];
		return key ? t(key) : String(status);
	};

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
			status: translateStatus(input.context.status),
			previousStatus: translateStatus(input.context.previousStatus),
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
			total: input.order?.total ?? "",
		},
	};
}
