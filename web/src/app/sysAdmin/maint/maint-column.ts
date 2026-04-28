import { SubscriptionStatus } from "@/types/enum";

import type { OrganizationSubscriptionStats } from "@/app/sysAdmin/organizations/organization-column";
import { emptyOrganizationSubscriptionStats } from "@/app/sysAdmin/organizations/organization-column";

/** Prisma `groupBy` row for `StoreSubscription.status`. */
export interface SubscriptionStatusGroupRow {
	status: number;
	_count: { _all: number };
}

/**
 * Builds platform-wide subscription counts from all stores vs `StoreSubscription` rows (one per store max).
 */
export function rollupGlobalStoreSubscriptions(
	storeCount: number,
	statusGroups: readonly SubscriptionStatusGroupRow[],
): OrganizationSubscriptionStats {
	const stats: OrganizationSubscriptionStats = {
		...emptyOrganizationSubscriptionStats,
	};
	let subscriptionRows = 0;

	for (const row of statusGroups) {
		const count = row._count._all;
		subscriptionRows += count;

		switch (row.status) {
			case SubscriptionStatus.Active:
				stats.active += count;
				break;
			case SubscriptionStatus.Inactive:
				stats.inactive += count;
				break;
			case SubscriptionStatus.Cancelled:
				stats.cancelled += count;
				break;
			default:
				stats.inactive += count;
				break;
		}
	}

	stats.noSubscription = Math.max(0, storeCount - subscriptionRows);
	return stats;
}
