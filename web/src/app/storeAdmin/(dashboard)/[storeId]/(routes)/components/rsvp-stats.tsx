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
import {
	IconCalendar,
	IconCreditCard,
	IconCurrencyDollar,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { RsvpSettings } from "@/types";
import useSWR from "swr";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfYear,
	endOfYear,
} from "date-fns";
import {
	convertToUtc,
	formatUtcDateToDateTimeLocal,
	dateToEpoch,
} from "@/utils/datetime-utils";

type PeriodType = "week" | "month" | "year" | "all";

interface RsvpStatsProps {
	rsvpSettings: RsvpSettings | null;
	defaultCurrency?: string | null;
	storeTimezone: string;
}

interface RsvpStatsData {
	// Upcoming RSVPs
	upcomingCount: number;
	upcomingTotalRevenue: number;
	upcomingFacilityCost: number;
	upcomingServiceStaffCost: number;

	// Completed RSVPs
	completedCount: number;
	completedTotalRevenue: number;
	completedFacilityCost: number;
	completedServiceStaffCost: number;

	// Customers
	customerCount: number;
	totalUnusedCredit: number;
}

export function RsvpStats({
	rsvpSettings,
	defaultCurrency = "TWD",
	storeTimezone,
}: RsvpStatsProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const [periodType, setPeriodType] = useState<PeriodType>("month");

	// Helper to get current date/time in store timezone (same as RsvpHistoryClient)
	const getNowInStoreTimezone = useCallback((): Date => {
		const now = new Date();
		const formatted = formatUtcDateToDateTimeLocal(now, storeTimezone);
		if (!formatted) return now;
		return convertToUtc(formatted, storeTimezone);
	}, [storeTimezone]);

	// Handle period change (same logic as RsvpHistoryClient)
	const handlePeriodChange = useCallback((period: PeriodType) => {
		setPeriodType(period);
	}, []);

	// Calculate date range based on period (same logic as RsvpHistoryClient)
	const dateRange = useMemo(() => {
		const nowInTz = getNowInStoreTimezone();

		// Extract date components in store timezone
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: storeTimezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		const parts = formatter.formatToParts(nowInTz);
		const getValue = (type: string): number =>
			Number(parts.find((p) => p.type === type)?.value || "0");

		const year = getValue("year");
		const month = getValue("month") - 1; // 0-indexed
		const day = getValue("day");
		const hour = getValue("hour");
		const minute = getValue("minute");

		// For "all" period, return null epoch values (no date filtering)
		if (periodType === "all") {
			return { startEpoch: null, endEpoch: null };
		}

		const storeDate = new Date(year, month, day, hour, minute);
		let periodStart: Date;
		let periodEnd: Date;

		switch (periodType) {
			case "week":
				periodStart = startOfWeek(storeDate, { weekStartsOn: 0 });
				periodEnd = endOfWeek(storeDate, { weekStartsOn: 0 });
				break;
			case "month":
				periodStart = startOfMonth(storeDate);
				periodEnd = endOfMonth(storeDate);
				break;
			case "year":
				periodStart = startOfYear(storeDate);
				periodEnd = endOfYear(storeDate);
				break;
			default:
				periodStart = startOfMonth(storeDate);
				periodEnd = endOfMonth(storeDate);
		}

		// Convert period boundaries to UTC (interpret as store timezone)
		const startStr = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-${String(periodStart.getDate()).padStart(2, "0")}T00:00`;
		const endStr = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}-${String(periodEnd.getDate()).padStart(2, "0")}T23:59`;

		const startDate = convertToUtc(startStr, storeTimezone);
		const endDate = convertToUtc(endStr, storeTimezone);

		const startEpoch = dateToEpoch(startDate);
		const endEpoch = dateToEpoch(endDate);

		return { startEpoch, endEpoch };
	}, [periodType, storeTimezone, getNowInStoreTimezone]);

	// Build URL with period query parameter
	// Only fetch if RSVP is enabled
	// For "all" period, don't send startEpoch/endEpoch
	const url =
		rsvpSettings?.acceptReservation && params.storeId && isHydrated
			? periodType === "all"
				? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=${periodType}`
				: dateRange.startEpoch && dateRange.endEpoch
					? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=${periodType}&startEpoch=${dateRange.startEpoch}&endEpoch=${dateRange.endEpoch}`
					: null
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
		upcomingTotalRevenue,
		upcomingFacilityCost,
		upcomingServiceStaffCost,
		completedCount,
		completedTotalRevenue,
		completedFacilityCost,
		completedServiceStaffCost,
		customerCount,
		totalUnusedCredit,
	} = data;

	// Format currency amounts
	const formatCurrency = (amount: number) => {
		const currency = (defaultCurrency || "TWD").toUpperCase();
		return new Intl.NumberFormat(lng, {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const stats: Array<{
		title: string;
		value: number;
		subValues: Array<{ label: string; value: number; isCurrency?: boolean }>;
		icon: typeof IconCalendar;
		href: string;
		color: string;
	}> = [
		{
			title: t("rsvp_upcoming_reservations") || "Upcoming Reservations",
			value: upcomingCount,
			subValues: [
				{
					label: t("rsvp_total_revenue") || "Total Revenue",
					value: upcomingTotalRevenue,
					isCurrency: true,
				},
				{
					label: t("rsvp_facility_cost") || "Facility Cost",
					value: upcomingFacilityCost,
					isCurrency: true,
				},
				{
					label: t("rsvp_service_staff_cost") || "Service Staff Cost",
					value: upcomingServiceStaffCost,
					isCurrency: true,
				},
			],
			icon: IconCalendar,
			href: `/storeAdmin/${params.storeId}/rsvp`,
			color: "text-blue-600",
		},
		{
			title:
				periodType === "week"
					? t("rsvp_completed_this_week") || "Completed This Week"
					: periodType === "month"
						? t("rsvp_completed_this_month") || "Completed This Month"
						: periodType === "year"
							? t("rsvp_completed_this_year") || "Completed This Year"
							: t("rsvp_completed_all") || "Completed (All)",
			value: completedCount,
			subValues: [
				{
					label: t("rsvp_total_revenue") || "Total Revenue",
					value: completedTotalRevenue,
					isCurrency: true,
				},
				{
					label: t("rsvp_facility_cost") || "Facility Cost",
					value: completedFacilityCost,
					isCurrency: true,
				},
				{
					label: t("rsvp_service_staff_cost") || "Service Staff Cost",
					value: completedServiceStaffCost,
					isCurrency: true,
				},
			],
			icon: IconCurrencyDollar,
			href: `/storeAdmin/${params.storeId}/rsvp`,
			color: "text-green-600",
		},
		{
			title: t("rsvp_customers_with_credit") || "Customers with Credit",
			value: customerCount,
			subValues: [
				{
					label: t("rsvp_total_unused_credit") || "Total Unused Credit",
					value: totalUnusedCredit,
					isCurrency: false,
				},
			],
			icon: IconCreditCard,
			href: `/storeAdmin/${params.storeId}/customers`,
			color: "text-purple-600",
		},
	];

	return (
		<div className="mt-4 p-2 sm:p-4 border rounded-lg bg-muted/30">
			{/* Period Toggle Buttons (same as RsvpHistoryClient) */}
			<div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
				<Button
					variant={periodType === "week" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("week")}
					className="h-10 sm:h-9"
				>
					{t("this_week") || "This Week"}
				</Button>
				<Button
					variant={periodType === "month" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("month")}
					className="h-10 sm:h-9"
				>
					{t("this_month") || "This Month"}
				</Button>
				<Button
					variant={periodType === "year" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("year")}
					className="h-10 sm:h-9"
				>
					{t("this_year") || "This Year"}
				</Button>
				<Button
					variant={periodType === "all" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("all")}
					className="h-10 sm:h-9"
				>
					{t("all") || "All"}
				</Button>
			</div>
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 mt-2">
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
									{stat.subValues.length > 0 && (
										<div className="space-y-1 text-sm text-muted-foreground">
											{stat.subValues.map((subValue, index) => (
												<div key={index}>
													{subValue.label}:{" "}
													{subValue.isCurrency
														? formatCurrency(subValue.value)
														: subValue.value.toLocaleString()}
												</div>
											))}
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
		</div>
	);
}
