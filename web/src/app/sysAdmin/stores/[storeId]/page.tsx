import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import {
	prismaStoreSubscriptionToInfo,
	toSysAdminStoreRow,
} from "../store-column";
import { StoreDetailActions } from "./store-detail-actions";

type Params = Promise<{ storeId: string }>;

export default async function SysAdminStoreDetailPage(props: {
	params: Params;
}) {
	const params = await props.params;

	const [store, storeSubscription] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			include: {
				Owner: { select: { id: true, name: true, email: true } },
				Organization: { select: { id: true, name: true, slug: true } },
			},
		}),
		sqlClient.storeSubscription.findUnique({
			where: { storeId: params.storeId },
		}),
	]);

	if (!store) {
		notFound();
	}

	transformPrismaDataForJson(store);
	if (storeSubscription) {
		transformPrismaDataForJson(storeSubscription);
	}

	const subscriptionInfo = storeSubscription
		? prismaStoreSubscriptionToInfo(storeSubscription)
		: null;

	const row = toSysAdminStoreRow(
		{
			id: store.id,
			name: store.name,
			ownerId: store.ownerId,
			defaultCurrency: store.defaultCurrency,
			defaultCountry: store.defaultCountry,
			defaultLocale: store.defaultLocale,
			updatedAt: store.updatedAt,
			isDeleted: store.isDeleted,
			isOpen: store.isOpen,
			acceptAnonymousOrder: store.acceptAnonymousOrder,
			autoAcceptOrder: store.autoAcceptOrder,
			Organization: store.Organization,
		},
		subscriptionInfo,
	);

	return (
		<Container className="space-y-6">
			<Button variant="outline" size="sm" asChild>
				<Link href="/sysAdmin/stores">← Stores</Link>
			</Button>
			<div className="flex flex-wrap items-center gap-3">
				<h1 className="text-xl font-semibold">{store.name}</h1>
				{store.isDeleted ? (
					<Badge variant="secondary">Archived</Badge>
				) : (
					<Badge>Active</Badge>
				)}
			</div>
			<p className="text-muted-foreground font-mono text-sm">{store.id}</p>
			<dl className="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">Owner</dt>
					<dd>{store.Owner.name ?? store.Owner.email ?? store.Owner.id}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Organization</dt>
					<dd>{store.Organization.name}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Slug</dt>
					<dd className="font-mono">{store.Organization.slug}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Updated</dt>
					<dd>{formatDateTime(epochToDate(store.updatedAt) ?? undefined)}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Subscription</dt>
					<dd>
						{row.subscription ? (
							<span className="space-x-2">
								<span>{row.subscription.statusLabel}</span>
								<span className="text-muted-foreground">
									({row.subscription.billingProvider}) · exp{" "}
									{formatDateTime(
										new Date(row.subscription.expiration),
									) ?? "—"}
								</span>
								{row.subscription.subscriptionId ? (
									<Button variant="outline" size="sm" asChild className="ml-2">
										<a
											href={`https://dashboard.stripe.com/subscriptions/${row.subscription.subscriptionId}`}
											target="_blank"
											rel="noreferrer"
										>
											Stripe
										</a>
									</Button>
								) : null}
							</span>
						) : (
							<span className="text-muted-foreground">None</span>
						)}
					</dd>
				</div>
			</dl>
			<StoreDetailActions store={row} />
			<Button asChild>
				<Link href={`/storeAdmin/${store.id}/dashboard`}>Open store admin</Link>
			</Button>
		</Container>
	);
}
