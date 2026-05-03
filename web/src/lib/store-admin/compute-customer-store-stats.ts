import { OrderStatus, RsvpStatus } from "@/types/enum";

export interface CustomerStoreStats {
	totalSpending: number;
	completedReservations: number;
	customerCreditFiat: number;
	customerCreditPoint: number;
}

/**
 * Aligns with {@link getCustomersAction}: completed/confirmed order totals minus refunds;
 * completed RSVP count; fiat/point from {@link CustomerCredit}.
 */
export function computeCustomerStoreStatsFromRelations(
	orders:
		| Array<{ orderTotal: unknown; orderStatus: number }>
		| null
		| undefined,
	reservations: Array<{ status: number }> | null | undefined,
	customerCredit: { fiat?: unknown; point?: unknown } | null | undefined,
): CustomerStoreStats {
	let totalSpending = 0;
	for (const order of orders ?? []) {
		const status = order.orderStatus;
		const orderTotal = Number(order.orderTotal) || 0;
		if (
			status === Number(OrderStatus.Completed) ||
			status === Number(OrderStatus.Confirmed)
		) {
			totalSpending += orderTotal;
		} else if (status === Number(OrderStatus.Refunded)) {
			totalSpending -= orderTotal;
		}
	}

	const completedReservations = (reservations ?? []).filter(
		(r) => r.status === Number(RsvpStatus.Completed),
	).length;

	return {
		totalSpending,
		completedReservations,
		customerCreditFiat: customerCredit ? Number(customerCredit.fiat) : 0,
		customerCreditPoint: customerCredit ? Number(customerCredit.point) : 0,
	};
}
