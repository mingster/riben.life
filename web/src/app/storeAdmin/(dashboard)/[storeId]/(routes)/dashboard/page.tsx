import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import type { RsvpSettings, Store } from "@/types";
import { StoreLevel } from "@/types/enum";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { StoreAdminDashboard } from "../components/store-admin-dashboard";

type Params = Promise<{ storeId: string }>;

type DashboardRecentOrder = {
	id: string;
	orderNum: number | null;
	orderTotal: unknown;
	orderStatus: number;
	isPaid: boolean;
	createdAt: bigint;
};

export default async function StoreAdminDashboardPage(props: {
	params: Params;
}) {
	const params = await props.params;

	const [store, productCount, orderCount, recentOrders] = await Promise.all([
		getStoreWithRelations(params.storeId, { includeRsvpSettings: true }),
		sqlClient.product.count({ where: { storeId: params.storeId } }),
		sqlClient.storeOrder.count({ where: { storeId: params.storeId } }),
		sqlClient.storeOrder.findMany({
			where: { storeId: params.storeId },
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				id: true,
				orderNum: true,
				orderTotal: true,
				orderStatus: true,
				isPaid: true,
				createdAt: true,
			},
		}),
	]);

	if (!store) {
		notFound();
	}

	transformPrismaDataForJson(recentOrders);
	transformPrismaDataForJson(store);

	const storeId = params.storeId;
	const rsvpSettings =
		(store as Store & { rsvpSettings?: RsvpSettings | null }).rsvpSettings ??
		null;
	const isProLevel = store.level !== StoreLevel.Free;

	return (
		<Container>
			<StoreAdminDashboard
				store={store}
				isProLevel={isProLevel}
				rsvpSettings={rsvpSettings}
			/>
			<div className="mt-8 grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Products</CardTitle>
						<CardDescription>Catalog size</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center justify-between gap-4">
						<p className="text-3xl font-bold tabular-nums">{productCount}</p>
						<Button variant="outline" size="sm" asChild>
							<Link href={`/storeAdmin/${storeId}/products`}>Manage</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Orders</CardTitle>
						<CardDescription>All-time count</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center justify-between gap-4">
						<p className="text-3xl font-bold tabular-nums">{orderCount}</p>
						<Button variant="outline" size="sm" asChild>
							<Link href={`/storeAdmin/${storeId}/order`}>View</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Recent orders</CardTitle>
					<CardDescription>Latest five by created time</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2 text-sm">
						{recentOrders.length === 0 ? (
							<li className="text-muted-foreground">No orders yet.</li>
						) : (
							(recentOrders as DashboardRecentOrder[]).map((o) => (
								<li
									key={o.id}
									className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
								>
									<Link
										className="font-mono text-primary underline-offset-4 hover:underline"
										href={`/storeAdmin/${storeId}/order/${o.id}`}
									>
										#{o.orderNum ?? o.id.slice(0, 8)}
									</Link>
									<span className="text-muted-foreground">
										{formatDateTime(epochToDate(o.createdAt) ?? undefined)}
									</span>
									<span className="tabular-nums">{String(o.orderTotal)}</span>
									<span>{o.isPaid ? "Paid" : "Unpaid"}</span>
								</li>
							))
						)}
					</ul>
				</CardContent>
			</Card>
		</Container>
	);
}
