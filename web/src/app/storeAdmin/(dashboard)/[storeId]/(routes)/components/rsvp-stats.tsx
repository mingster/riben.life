"use client";

import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { IconCalendar, IconCheck, IconCreditCard } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { RsvpSettings } from "@/types";
import useSWR from "swr";
import { useIsHydrated } from "@/hooks/use-hydrated";

interface RsvpStatsProps {
	rsvpSettings: RsvpSettings | null;
}

interface RsvpStatsData {
	upcomingCount: number;
	completedThisMonthCount: number;
	unusedCreditCount: number;
	totalUnusedCredit: number;
}

export function RsvpStats({ rsvpSettings }: RsvpStatsProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();

	// Only fetch if RSVP is enabled
	const url =
		rsvpSettings?.acceptReservation && params.storeId && isHydrated
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats`
			: null;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const { data, error, isLoading } = useSWR<RsvpStatsData>(url, fetcher);

	// Don't render if RSVP is not enabled
	if (!rsvpSettings?.acceptReservation) {
		return null;
	}

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-4">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="@container/card">
						<CardHeader>
							<CardDescription>
								<Skeleton className="h-4 w-24" />
							</CardDescription>
							<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
								<Skeleton className="h-8 w-16" />
							</CardTitle>
							<Badge variant="outline">
								<Skeleton className="h-4 w-4 rounded-full" />
							</Badge>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	// Show loading state
	if (isLoading) {
		return (
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-4">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="@container/card">
						<CardHeader>
							<CardDescription>
								<Skeleton className="h-4 w-24" />
							</CardDescription>
							<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
								<Skeleton className="h-8 w-16" />
							</CardTitle>
							<Badge variant="outline">
								<Skeleton className="h-4 w-4 rounded-full" />
							</Badge>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	// Show error state
	if (error || !data) {
		return null; // Silently fail - don't show error UI
	}

	const {
		upcomingCount,
		completedThisMonthCount,
		unusedCreditCount,
		totalUnusedCredit,
	} = data;

	const stats: Array<{
		title: string;
		value: number;
		subValue?: number;
		subValueLabel?: string;
		icon: typeof IconCalendar;
		href: string;
		color: string;
	}> = [
		{
			title: t("rsvp_upcoming_reservations") || "Upcoming Reservations",
			value: upcomingCount,
			icon: IconCalendar,
			href: `/storeAdmin/${params.storeId}/rsvp`,
			color: "text-blue-600",
		},
		{
			title: t("rsvp_completed_this_month") || "Completed This Month",
			value: completedThisMonthCount,
			icon: IconCheck,
			href: `/storeAdmin/${params.storeId}/rsvp`,
			color: "text-green-600",
		},
		{
			title: t("rsvp_unused_customer_credit") || "Customers with Credit",
			value: unusedCreditCount,
			subValue: totalUnusedCredit,
			subValueLabel: t("rsvp_total_unused_credit") || "Total unused credit",
			icon: IconCreditCard,
			href: `/storeAdmin/${params.storeId}/customers`,
			color: "text-purple-600",
		},
	];

	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-4">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Link key={stat.title} href={stat.href} className="block">
						<Card className="@container/card hover:shadow-md transition-shadow cursor-pointer">
							<CardHeader>
								<CardDescription className="flex items-center gap-2">
									<Badge variant="outline">
										<Icon className={`h-4 w-4 ${stat.color}`} />
									</Badge>
									{stat.title}
								</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stat.value}
								</CardTitle>
								{stat.subValue !== undefined && (
									<div className="text-sm text-muted-foreground">
										{stat.subValueLabel}: {stat.subValue.toLocaleString()}
									</div>
								)}
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="text-muted-foreground">
									{t("rsvp_stats_click_to_view")}
								</div>
							</CardFooter>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
