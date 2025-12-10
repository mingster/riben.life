import type { StoreOrder } from "@/types";
import type { orderitemview } from "@prisma/client";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";

export interface TransactionColumn {
	id: string;
	storeId: string;
	user: string;
	orderStatus: number;
	amount: number;
	refundAmount: number;
	currency: string;
	isPaid: boolean;
	updatedAt: string;
	paymentMethod?: string | null;
	shippingMethod?: string | null;
	orderItems: orderitemview[];
	orderNum: number;
	paymentCost: number;
	note: string;
	updatedAtIso: string;
}

export const mapStoreOrderToColumn = (
	order: StoreOrder,
): TransactionColumn => ({
	id: order.id,
	storeId: order.storeId,
	user: order.User?.name ?? order.User?.email ?? "",
	orderStatus: Number(order.orderStatus ?? 0),
	amount: Number(order.orderTotal ?? 0),
	refundAmount: Number(order.refundAmount ?? 0),
	currency: order.currency ?? "",
	isPaid: Boolean(order.isPaid),
	updatedAt: formatDateTime(order.updatedAt),
	paymentMethod: order.PaymentMethod?.name ?? null,
	shippingMethod: order.ShippingMethod?.name ?? null,
	orderItems: order.OrderItemView ?? [],
	orderNum: Number(order.orderNum ?? 0),
	paymentCost: Number(order.paymentCost ?? 0),
	note: order.OrderNotes?.[0]?.note ?? "",
	updatedAtIso: epochToDate(order.updatedAt)?.toISOString() ?? "",
});
