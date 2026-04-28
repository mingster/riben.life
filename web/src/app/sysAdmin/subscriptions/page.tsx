import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientSubscriptions } from "./components/client-subscriptions";
import {
	type SysAdminSubscriptionRow,
	subscriptionStatusToLabel,
} from "./subscription-row";

export default async function SysAdminSubscriptionsPage() {
	const subscriptions = await sqlClient.storeSubscription.findMany({
		orderBy: { updatedAt: "desc" },
		take: 500,
	});

	const storeIds = [...new Set(subscriptions.map((s) => s.storeId))];
	const userIds = [...new Set(subscriptions.map((s) => s.userId))];

	const [stores, users] = await Promise.all([
		sqlClient.store.findMany({
			where: { id: { in: storeIds } },
			select: { id: true, name: true },
		}),
		sqlClient.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, name: true, email: true },
		}),
	]);

	transformPrismaDataForJson(subscriptions);

	const storeMap = new Map(stores.map((s) => [s.id, s.name]));
	const userMap = new Map(users.map((u) => [u.id, u]));

	const rows: SysAdminSubscriptionRow[] = subscriptions.map((sub) => {
		const u = userMap.get(sub.userId);
		return {
			id: sub.id,
			storeId: sub.storeId,
			storeName: storeMap.get(sub.storeId) ?? sub.storeId,
			userId: sub.userId,
			userEmail: u?.email ?? null,
			userName: u?.name ?? null,
			expiration: Number(sub.expiration),
			status: sub.status,
			statusLabel: subscriptionStatusToLabel(sub.status),
			invoiceNumber: sub.invoiceNumber,
			billingProvider: sub.billingProvider,
			subscriptionId: sub.subscriptionId,
			note: sub.note,
			createdAt: Number(sub.createdAt),
			updatedAt: Number(sub.updatedAt),
		};
	});

	return (
		<Container>
			<h1 className="mb-4 text-xl font-semibold">Subscriptions</h1>
			<p className="text-muted-foreground mb-6 text-sm">
				Platform billing subscriptions per store ({rows.length} shown,
				max 500).
			</p>
			<ClientSubscriptions rows={rows} />
		</Container>
	);
}
