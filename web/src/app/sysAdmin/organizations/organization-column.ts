/** Per-organization rollup of `StoreSubscription` by store (one sub row per store at most). */
export interface OrganizationSubscriptionStats {
	active: number;
	inactive: number;
	cancelled: number;
	noSubscription: number;
}

export const emptyOrganizationSubscriptionStats: OrganizationSubscriptionStats = {
	active: 0,
	inactive: 0,
	cancelled: 0,
	noSubscription: 0,
};

export interface SysAdminOrganizationRow {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	metadata: string | null;
	createdAt: string;
	storeCount: number;
	subscriptionStats: OrganizationSubscriptionStats;
}

export function toSysAdminOrganizationRow(
	row: {
		id: string;
		name: string;
		slug: string;
		logo: string | null;
		metadata: string | null;
		createdAt: Date | string;
		_count: { stores: number };
	},
	subscriptionStats: OrganizationSubscriptionStats = emptyOrganizationSubscriptionStats,
): SysAdminOrganizationRow {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		logo: row.logo,
		metadata: row.metadata,
		createdAt:
			typeof row.createdAt === "string"
				? row.createdAt
				: row.createdAt.toISOString(),
		storeCount: row._count.stores,
		subscriptionStats,
	};
}
