"use client";

import { useTranslation } from "@/app/i18n/client";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/providers/i18n-provider";
import type { RsvpSettings } from "@/types";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import {
	IconCalendar,
	IconCreditCard,
	IconCurrencyDollar,
} from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	getPeriodLabel,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";

interface RsvpStatsProps {
	rsvpSettings: RsvpSettings | null;
	defaultCurrency?: string | null;
	storeTimezone: string;
}

interface FacilityStat {
	facilityId: string;
	facilityName: string;
	totalRevenue: number;
	count: number;
}

interface ServiceStaffStat {
	serviceStaffId: string;
	staffName: string;
	totalRevenue: number;
	count: number;
}

interface ReadyRsvp {
	rsvpTime: bigint | string | number;
	customerName: string;
	facilityName: string | null;
}

interface RsvpStatsData {
	// Ready RSVPs (within period)
	readyCount: number;
	readyRsvps: ReadyRsvp[];

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

	// Facility breakdown
	facilityStats: FacilityStat[];

	// Service staff breakdown
	serviceStaffStats: ServiceStaffStat[];

	// Customers
	customerCount: number;
	totalUnusedCredit: number;
	totalCustomerCount: number;
	newCustomerCount: number;
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

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(storeTimezone);

	// Initialize period range with default "month" period epoch values
	// This ensures the URL is valid immediately, and RsvpPeriodSelector will update it
	// with the correct values (from localStorage or user selection) via onPeriodRangeChange
	const initialPeriodRange = useMemo<PeriodRangeWithDates>(() => {
		const monthRange = defaultPeriodRanges.month;
		return {
			periodType: "month",
			startDate: null,
			endDate: null,
			startEpoch: monthRange.startEpoch,
			endEpoch: monthRange.endEpoch,
		};
	}, [defaultPeriodRanges]);

	const [periodRange, setPeriodRange] =
		useState<PeriodRangeWithDates>(initialPeriodRange);

	// Handle period range change from RsvpPeriodSelector
	const handlePeriodRangeChange = useCallback((range: PeriodRangeWithDates) => {
		setPeriodRange(range);
	}, []);

	// Build API URL based on current period range
	const currentUrl = useMemo(() => {
		if (!rsvpSettings?.acceptReservation || !params.storeId || !isHydrated) {
			return null;
		}

		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=all`;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (startEpoch && endEpoch) {
			return `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=${periodType}&startEpoch=${startEpoch}&endEpoch=${endEpoch}`;
		}

		// Fallback: return null if epoch values are missing
		return null;
	}, [
		periodRange,
		rsvpSettings?.acceptReservation,
		params.storeId,
		isHydrated,
	]);

	// Fetch data on-demand (lazy loading for better initial performance)
	// Only fetch the current period - SWR will cache it for instant switching back
	const fetcher = async (url: RequestInfo) => {
		const res = await fetch(url);
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
		}
		return res.json();
	};

	const { data, isLoading, error } = useSWR<RsvpStatsData>(currentUrl, fetcher);

	// Don't render if RSVP is not enabled
	if (!rsvpSettings?.acceptReservation) {
		return null;
	}

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-4">
				{[1, 2, 3, 4].map((i) => (
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
					</Card>
				))}
			</div>
		);
	}

	// Show loading state
	if (isLoading) {
		return (
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-4">
				{[1, 2, 3, 4].map((i) => (
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
					</Card>
				))}
			</div>
		);
	}

	// Show error state
	if (error) {
		// Still show loading/empty state instead of error UI for better UX
		return null;
	}

	// Show error state (only if current period data is missing)
	if (!data) {
		return null; // Silently fail - don't show error UI
	}

	const {
		readyCount,
		readyRsvps,
		completedTotalRevenue,
		facilityStats,
		serviceStaffStats,
		totalUnusedCredit,
		newCustomerCount,
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

	// Format ready RSVPs for display
	const readyRsvpsDisplay = readyRsvps.map((rsvp) => {
		const rsvpTimeValue =
			typeof rsvp.rsvpTime === "bigint" ||
			typeof rsvp.rsvpTime === "string" ||
			typeof rsvp.rsvpTime === "number"
				? BigInt(rsvp.rsvpTime)
				: BigInt(0);
		const rsvpTimeDate = epochToDate(rsvpTimeValue);
		const formattedTime = rsvpTimeDate
			? format(
					getDateInTz(rsvpTimeDate, getOffsetHours(storeTimezone)),
					"MM/dd HH:mm",
				)
			: "N/A";

		const facilityText = rsvp.facilityName ? ` - ${rsvp.facilityName}` : "";
		return {
			label: `${formattedTime} - ${rsvp.customerName}${facilityText}`,
			value: "",
			isCurrency: false,
		};
	});

	// Format facility stats for display - list all facilities with revenue and RSVP count
	const facilityStatsDisplay = facilityStats.map((facility) => ({
		label: facility.facilityName,
		value: `${formatCurrency(facility.totalRevenue)} (${facility.count})`,
		isCurrency: false,
	}));

	// Format service staff stats for display
	const serviceStaffStatsDisplay = serviceStaffStats.map((staff) => ({
		label: staff.staffName,
		value: `${formatCurrency(staff.totalRevenue)} / ${staff.count}`,
		isCurrency: false,
	}));

	// Get period label for interpolation (using utility from RsvpPeriodSelector)
	const periodLabel = getPeriodLabel(periodRange.periodType, t);

	// Calculate total facility revenue
	const totalFacilityRevenue = facilityStats.reduce(
		(sum, facility) => sum + facility.totalRevenue,
		0,
	);

	// Calculate total service staff revenue
	const totalServiceStaffRevenue = serviceStaffStats.reduce(
		(sum, staff) => sum + staff.totalRevenue,
		0,
	);

	const stats: Array<{
		title: string;
		value: number | string;
		subValues: Array<{
			label: string;
			value: number | string;
			isCurrency?: boolean;
		}>;
		icon: typeof IconCalendar;
		href: string;
		color: string;
	}> = [
		{
			title:
				t("rsvp_stat_ready_reservations", {
					period: periodLabel,
				}) || "Ready Reservations",
			value: readyCount,
			subValues: readyRsvpsDisplay.length > 0 ? readyRsvpsDisplay : [],
			icon: IconCalendar,
			href: `/storeAdmin/${params.storeId}/rsvp/history?rsvp_status=ready`,
			color: "text-orange-600",
		},
		{
			title: t("rsvp_stat_facility_usage") || "Facility Usage",
			value: formatCurrency(totalFacilityRevenue),
			subValues: facilityStatsDisplay.length > 0 ? facilityStatsDisplay : [],
			icon: IconCalendar,
			href: `/storeAdmin/${params.storeId}/balances`,
			color: "text-blue-600",
		},
		{
			title: t("rsvp_stat_service_staff") || "Service Staff",
			value: formatCurrency(totalServiceStaffRevenue),
			subValues:
				serviceStaffStatsDisplay.length > 0 ? serviceStaffStatsDisplay : [],
			icon: IconCurrencyDollar,
			href: `/storeAdmin/${params.storeId}/balances`,
			color: "text-green-600",
		},
		{
			title: t("rsvp_stat_general_statistics") || "General Statistics",
			value: "",
			subValues: [
				{
					label:
						t("rsvp_stat_completed_reservation_revenue", {
							period: periodLabel,
						}) || "Completed Reservation Revenue",
					value: completedTotalRevenue,
					isCurrency: true,
				},
				{
					label:
						t("rsvp_stat_new_customers", {
							period: periodLabel,
						}) || "New Customers",
					value: newCustomerCount,
					isCurrency: false,
				},
				{
					label:
						t("rsvp_stat_unused_account_balance") || "Unused Account Balance",
					value: totalUnusedCredit,
					isCurrency: true,
				},
			],
			icon: IconCreditCard,
			href: `/storeAdmin/${params.storeId}/customers`,
			color: "text-purple-600",
		},
	];

	return (
		<div
			className="mt-0 p-2 sm:p-4 border rounded-lg bg-muted/30"
			data-testid="rsvp-stats-container"
		>
			{/* Period Toggle Buttons */}
			<RsvpPeriodSelector
				storeTimezone={storeTimezone}
				storeId={params.storeId}
				defaultPeriod="month"
				allowCustom={true}
				onPeriodRangeChange={handlePeriodRangeChange}
				className="mb-4"
			/>
			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mt-2">
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
										{typeof stat.value === "number" ? stat.value : stat.value}
									</CardTitle>
									{stat.subValues.length > 0 && (
										<div className="space-y-1 text-sm text-muted-foreground">
											{stat.subValues.map((subValue, index) => (
												<div key={index}>
													{subValue.value === "" ? (
														subValue.label
													) : (
														<>
															{subValue.label}:{" "}
															{subValue.isCurrency
																? formatCurrency(
																		typeof subValue.value === "number"
																			? subValue.value
																			: 0,
																	)
																: typeof subValue.value === "number"
																	? subValue.value.toLocaleString()
																	: subValue.value}
														</>
													)}
												</div>
											))}
										</div>
									)}
								</CardHeader>
							</Card>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
