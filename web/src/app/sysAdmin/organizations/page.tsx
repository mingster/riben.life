import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { SubscriptionStatus } from "@/types/enum";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Suspense } from "react";

import { ClientOrganizations } from "./components/client-organizations";
import {
	emptyOrganizationSubscriptionStats,
	type OrganizationSubscriptionStats,
	toSysAdminOrganizationRow,
} from "./organization-column";

function aggregateSubscriptionStatsForOrganization(
	storeRows: readonly { id: string; organizationId: string }[],
	subscriptionByStoreId: ReadonlyMap<string, { status: number }>,
	organizationId: string,
): OrganizationSubscriptionStats {
	const stats: OrganizationSubscriptionStats = {
		...emptyOrganizationSubscriptionStats,
	};
	for (const st of storeRows) {
		if (st.organizationId !== organizationId) continue;
		const sub = subscriptionByStoreId.get(st.id);
		if (!sub) {
			stats.noSubscription += 1;
			continue;
		}
		switch (sub.status) {
			case SubscriptionStatus.Active:
				stats.active += 1;
				break;
			case SubscriptionStatus.Inactive:
				stats.inactive += 1;
				break;
			case SubscriptionStatus.Cancelled:
				stats.cancelled += 1;
				break;
			default:
				stats.inactive += 1;
				break;
		}
	}
	return stats;
}

export default async function SysAdminOrganizationsPage() {
	const [organizations, stores, subscriptions] = await Promise.all([
		sqlClient.organization.findMany({
			orderBy: { name: "asc" },
			take: 500,
			include: {
				_count: { select: { stores: true } },
			},
		}),
		sqlClient.store.findMany({
			select: { id: true, organizationId: true },
			take: 5000,
		}),
		sqlClient.storeSubscription.findMany({
			select: { storeId: true, status: true },
			take: 5000,
		}),
	]);

	transformPrismaDataForJson(organizations);
	transformPrismaDataForJson(stores);
	transformPrismaDataForJson(subscriptions);

	const subscriptionByStoreId = new Map(
		subscriptions.map((s) => [s.storeId, s]),
	);

	const serverOrganizations = organizations.map((org) =>
		toSysAdminOrganizationRow(
			org,
			aggregateSubscriptionStatsForOrganization(
				stores,
				subscriptionByStoreId,
				org.id,
			),
		),
	);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<h1 className="mb-4 text-xl font-semibold">Organizations</h1>
				<p className="text-muted-foreground mb-6 text-sm">
					Create and edit organizations. Stores belong to an organization. You can
					only delete an organization after all its stores are removed or
					reassigned.
				</p>
				<ClientOrganizations serverOrganizations={serverOrganizations} />
			</Container>
		</Suspense>
	);
}
