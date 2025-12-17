"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	IconBell,
	IconClock,
	IconX,
	IconTrendingUp,
} from "@tabler/icons-react";

interface StatsCardsProps {
	total24h: number;
	total7d: number;
	total30d: number;
	pendingCount: number;
	failedCount: number;
	successRate: number;
}

export function StatsCards({
	total24h,
	total7d,
	total30d,
	pendingCount,
	failedCount,
	successRate,
}: StatsCardsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total (24h)</CardTitle>
					<IconBell className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{total24h.toLocaleString()}</div>
					<p className="text-xs text-muted-foreground">
						{total7d.toLocaleString()} in last 7 days
					</p>
					<p className="text-xs text-muted-foreground">
						{total30d.toLocaleString()} in last 30 days
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Pending</CardTitle>
					<IconClock className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						{pendingCount.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">Awaiting delivery</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Failed</CardTitle>
					<IconX className="h-4 w-4 text-destructive" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-destructive">
						{failedCount.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">Requires attention</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Success Rate</CardTitle>
					<IconTrendingUp className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{successRate}%</div>
					<p className="text-xs text-muted-foreground">Last 24 hours</p>
				</CardContent>
			</Card>
		</div>
	);
}
