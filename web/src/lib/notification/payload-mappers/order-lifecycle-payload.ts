import type { StoreOrder, User } from "@/types";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

export interface OrderLifecyclePayloadInput {
	order?: StoreOrder | null;
	user?: User | null;
	storeName?: string | null;
}

export function buildOrderLifecyclePayload(
	input: OrderLifecyclePayloadInput,
): Record<string, unknown> {
	const createdOn = input.order?.createdAt
		? epochToDate(input.order.createdAt)
		: null;
	return {
		customer: {
			id: input.user?.id ?? "",
			name: input.user?.name ?? "",
			email: input.user?.email ?? "",
		},
		store: {
			id: input.order?.storeId ?? "",
			name: input.storeName ?? "",
		},
		order: {
			id: input.order?.id ?? "",
			orderNumber: input.order?.id ?? "",
			createdOn: createdOn ? formatDateTime(createdOn) : "",
			total: input.order?.total ?? null,
		},
	};
}
