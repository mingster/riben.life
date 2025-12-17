"use client";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import { StatsCards } from "./stats-cards";
import { ChannelDistribution } from "./channel-distribution";
import { RecentActivity } from "./recent-activity";
import { SystemHealth } from "./system-health";

interface DashboardStats {
	total24h: number;
	total7d: number;
	total30d: number;
	pendingCount: number;
	failedCount: number;
	successRate: number;
	channelDistribution: Array<{
		channel: string;
		count: number;
	}>;
	queueSize: number;
	avgProcessingTime: number;
	recentNotifications: Array<{
		id: string;
		subject: string;
		recipientName: string;
		createdAt: number;
		sentOn: number | null;
		statuses: Array<{
			channel: string;
			status: string;
		}>;
	}>;
}

interface ClientNotificationDashboardProps {
	initialStats: DashboardStats;
}

export function ClientNotificationDashboard({
	initialStats,
}: ClientNotificationDashboardProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div className="space-y-6">
			<Heading
				title="Notification System Dashboard"
				description="Overview of notification system health and statistics"
			/>
			<Separator />

			{/* Stats Cards */}
			<StatsCards
				total24h={initialStats.total24h}
				total7d={initialStats.total7d}
				total30d={initialStats.total30d}
				pendingCount={initialStats.pendingCount}
				failedCount={initialStats.failedCount}
				successRate={initialStats.successRate}
			/>

			{/* Channel Distribution */}
			<Card>
				<CardHeader>
					<CardTitle>Channel Distribution (Last 24 Hours)</CardTitle>
					<CardDescription>
						Number of notifications sent per channel
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChannelDistribution data={initialStats.channelDistribution} />
				</CardContent>
			</Card>

			{/* System Health and Recent Activity in Grid */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* System Health */}
				<SystemHealth
					queueSize={initialStats.queueSize}
					avgProcessingTime={initialStats.avgProcessingTime}
					successRate={initialStats.successRate}
				/>

				{/* Recent Activity */}
				<RecentActivity notifications={initialStats.recentNotifications} />
			</div>
		</div>
	);
}
