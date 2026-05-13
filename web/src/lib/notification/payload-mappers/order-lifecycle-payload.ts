import type { orderitemview } from "@prisma/client";
import type { StoreOrder, User } from "@/types";
import { getBaseUrlForMail } from "@/lib/notification/email-template";
import { translateRsvpStatusForNotification } from "@/lib/notification/translate-rsvp-status-for-notification";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

export interface OrderLifecycleReservationData {
	id?: string | null;
	status?: string | number | null;
	previousStatus?: string | number | null;
	dateTime?: string | null;
	arriveTime?: string | null;
	facilityName?: string | null;
	serviceStaffName?: string | null;
	numOfAdult?: number | string | null;
	numOfChild?: number | string | null;
	message?: string | null;
	checkInCode?: string | null;
	actionUrl?: string | null;
	orderId?: string | null;
	paymentAmount?: number | string | null;
	paymentCurrency?: string | null;
	refundAmount?: number | string | null;
	refundCurrency?: string | null;
}

export interface OrderLifecyclePayloadInput {
	order?: StoreOrder | null;
	user?: User | null;
	storeName?: string | null;
	orderUrl?: string | null;
	accountBalanceBefore?: number | string | null;
	accountBalanceAfter?: number | string | null;
	reservation?: OrderLifecycleReservationData | null;
	/**
	 * When set, localizes `reservation.status` / `previousStatus` for templates
	 * (RSVP numeric codes and English labels from `en` `notif_status_*` strings).
	 */
	locale?: string | null;
}

function formatOrderItemMoney(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	}).format(amount);
}

function formatOrderItemsSummary(
	items: orderitemview[] | null | undefined,
	currency: string | null | undefined,
): string {
	if (!items?.length) {
		return "";
	}

	const currencyCode = (currency ?? "TWD").toUpperCase();

	return items
		.map((item) => {
			const quantity = item.quantity ?? 0;
			const unitPrice = Number(item.unitPrice ?? 0);
			const line = `${item.name} ×${quantity} @ ${formatOrderItemMoney(unitPrice, currencyCode)}`;
			const variants = item.variants?.trim();
			if (!variants) {
				return line;
			}

			const optionLines = variants
				.split(",")
				.map((option) => option.trim())
				.filter(Boolean)
				.map((option) => `  • ${option}`)
				.join("\n");

			return `${line}\n${optionLines}`;
		})
		.join("\n");
}

function buildDefaultOrderUrl(orderId: string | null | undefined): string {
	if (!orderId) {
		return "";
	}

	const base = getBaseUrlForMail().replace(/\/$/, "");
	return `${base}/account/orders/${encodeURIComponent(orderId)}`;
}

function formatAccountBalanceValue(
	value: number | string | null | undefined,
): string {
	if (value == null || value === "") {
		return "";
	}

	return typeof value === "number" ? String(value) : value;
}

export function buildOrderLifecyclePayload(
	input: OrderLifecyclePayloadInput,
): Record<string, unknown> {
	const createdOn = input.order?.createdAt
		? epochToDate(input.order.createdAt)
		: null;

	const updatedAt = input.order?.updatedAt
		? epochToDate(input.order.updatedAt)
		: null;

	const reservation = input.reservation ?? {};
	const locale = input.locale?.trim() || null;

	const reservationStatus = locale
		? translateRsvpStatusForNotification(locale, reservation.status ?? "")
		: String(reservation.status ?? "");
	const reservationPreviousStatus = locale
		? translateRsvpStatusForNotification(
				locale,
				reservation.previousStatus ?? "",
			)
		: String(reservation.previousStatus ?? "");

	return {
		customer: {
			id: input.user?.id ?? "",
			name: input.user?.name ?? "",
			email: input.user?.email ?? "",
			phone: input.user?.phoneNumber ?? "",
		},
		store: {
			id: input.order?.storeId ?? "",
			name: input.storeName ?? "",
		},
		order: {
			id: input.order?.id ?? "",
			orderNumber: input.order?.id ?? "",
			createdOn: createdOn ? formatDateTime(createdOn) : "",
			updatedAt: updatedAt ? formatDateTime(updatedAt) : "",
			total: input.order?.total ?? null,
			itemsSummary: formatOrderItemsSummary(
				input.order?.OrderItemView,
				input.order?.currency,
			),
			url: input.orderUrl ?? buildDefaultOrderUrl(input.order?.id),
		},
		accountBalance: {
			before: formatAccountBalanceValue(input.accountBalanceBefore),
			after: formatAccountBalanceValue(input.accountBalanceAfter),
		},
		reservation: {
			id: reservation.id ?? "",
			status: reservationStatus,
			previousStatus: reservationPreviousStatus,
			dateTime: reservation.dateTime ?? "",
			arriveTime: reservation.arriveTime ?? "",
			facilityName: reservation.facilityName ?? "",
			serviceStaffName: reservation.serviceStaffName ?? "",
			numOfAdult: reservation.numOfAdult ?? "",
			numOfChild: reservation.numOfChild ?? "",
			message: reservation.message ?? "",
			checkInCode: reservation.checkInCode ?? "",
			actionUrl: reservation.actionUrl ?? "",
			orderId: reservation.orderId ?? input.order?.id ?? "",
			paymentAmount: reservation.paymentAmount ?? "",
			paymentCurrency: reservation.paymentCurrency ?? "",
			refundAmount: reservation.refundAmount ?? "",
			refundCurrency: reservation.refundCurrency ?? "",
		},
	};
}
