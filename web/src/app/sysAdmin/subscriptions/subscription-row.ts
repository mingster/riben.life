import { SubscriptionStatus } from "@/types/enum";

/**
 * SysAdmin store subscription list row (JSON-serializable for client).
 */
export interface SysAdminSubscriptionRow {
	id: string;
	storeId: string;
	storeName: string;
	userId: string;
	userEmail: string | null;
	userName: string | null;
	expiration: number;
	status: number;
	statusLabel: string;
	invoiceNumber: string | null;
	billingProvider: string;
	subscriptionId: string | null;
	note: string;
	createdAt: number;
	updatedAt: number;
}

export function subscriptionStatusToLabel(status: number): string {
	switch (status) {
		case SubscriptionStatus.Inactive:
			return "Inactive";
		case SubscriptionStatus.Active:
			return "Active";
		case SubscriptionStatus.Cancelled:
			return "Cancelled";
		default:
			return `Unknown (${status})`;
	}
}
