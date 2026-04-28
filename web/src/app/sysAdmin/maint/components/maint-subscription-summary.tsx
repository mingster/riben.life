import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { OrganizationSubscriptionStats } from "@/app/sysAdmin/organizations/organization-column";

interface MaintSubscriptionSummaryProps {
	readonly storeCount: number;
	readonly stats: OrganizationSubscriptionStats;
	readonly storeSubscriptionRowCount: number;
	readonly subscriptionPaymentCount: number;
	readonly paidTierStoreCount: number;
}

/**
 * Platform-wide subscription snapshot for the maintenance dashboard (aligned with org/store rollups).
 */
export function MaintSubscriptionSummary({
	storeCount,
	stats,
	storeSubscriptionRowCount,
	subscriptionPaymentCount,
	paidTierStoreCount,
}: MaintSubscriptionSummaryProps) {
	return (
		<Card className="border-muted">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">Subscriptions</CardTitle>
				<CardDescription className="text-xs font-mono text-gray-500">
					Rollup across all stores (one subscription row per store). A = active, I =
					inactive, C = cancelled, N = no subscription row.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-muted-foreground">
						Stores{" "}
						<span className="font-medium text-foreground tabular-nums">
							{storeCount}
						</span>
					</span>
					<span className="text-muted-foreground">
						Sub rows{" "}
						<span className="font-medium text-foreground tabular-nums">
							{storeSubscriptionRowCount}
						</span>
					</span>
					<span className="text-muted-foreground">
						Payments{" "}
						<span className="font-medium text-foreground tabular-nums">
							{subscriptionPaymentCount}
						</span>
					</span>
					<span className="text-muted-foreground">
						Paid-tier stores{" "}
						<span className="font-medium text-foreground tabular-nums">
							{paidTierStoreCount}
						</span>
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="tabular-nums">
						A {stats.active}
					</Badge>
					<Badge variant="outline" className="tabular-nums">
						I {stats.inactive}
					</Badge>
					<Badge variant="outline" className="tabular-nums">
						C {stats.cancelled}
					</Badge>
					<Badge variant="outline" className="tabular-nums">
						N {stats.noSubscription}
					</Badge>
					<Button variant="outline" size="sm" className="touch-manipulation" asChild>
						<Link href="/sysAdmin/stores">Stores &amp; billing</Link>
					</Button>
					<Button variant="ghost" size="sm" className="touch-manipulation" asChild>
						<Link href="/sysAdmin/organizations">Organizations</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
