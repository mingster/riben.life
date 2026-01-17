"use client";

import { useTranslation } from "@/app/i18n/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	convertToUtc,
	dateToEpoch,
	formatUtcDateToDateTimeLocal,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import {
	IconCalendar,
	IconCreditCard,
	IconCurrencyDollar,
} from "@tabler/icons-react";
import {
	endOfMonth,
	endOfWeek,
	endOfYear,
	startOfMonth,
	startOfWeek,
	startOfYear,
	format,
} from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

type PeriodType = "week" | "month" | "year" | "all";

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

	// Pre-calculate date ranges for all periods
	const allPeriodRanges = useMemo(() => {
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

		const storeDate = new Date(year, month, day, hour, minute);

		// Helper to calculate date range for a period
		const calculateRange = (period: PeriodType) => {
			if (period === "all") {
				return { startEpoch: null, endEpoch: null };
			}

			let periodStart: Date;
			let periodEnd: Date;

			switch (period) {
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
		};

		return {
			week: calculateRange("week"),
			month: calculateRange("month"),
			year: calculateRange("year"),
			all: calculateRange("all"),
		};
	}, [storeTimezone, getNowInStoreTimezone]);

	// Helper to build URL for a period
	const buildUrl = useCallback(
		(period: PeriodType) => {
			if (!rsvpSettings?.acceptReservation || !params.storeId || !isHydrated) {
				return null;
			}

			const range = allPeriodRanges[period];
			if (period === "all") {
				return `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=${period}`;
			}

			if (range.startEpoch && range.endEpoch) {
				return `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/rsvp/stats?period=${period}&startEpoch=${range.startEpoch}&endEpoch=${range.endEpoch}`;
			}

			return null;
		},
		[
			rsvpSettings?.acceptReservation,
			params.storeId,
			isHydrated,
			allPeriodRanges,
		],
	);

	// Fetch data on-demand (lazy loading for better initial performance)
	// Only fetch the current period - SWR will cache it for instant switching back
	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

	const weekUrl = buildUrl("week");
	const monthUrl = buildUrl("month");
	const yearUrl = buildUrl("year");
	const allUrl = buildUrl("all");

	// Only fetch the currently selected period
	// SWR caches the data, so switching back to a previously viewed period is instant
	const currentUrl = useMemo(() => {
		switch (periodType) {
			case "week":
				return weekUrl;
			case "month":
				return monthUrl;
			case "year":
				return yearUrl;
			case "all":
				return allUrl;
			default:
				return monthUrl;
		}
	}, [periodType, weekUrl, monthUrl, yearUrl, allUrl]);

	const { data, isLoading } = useSWR<RsvpStatsData>(currentUrl, fetcher);

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

	// Get period label for interpolation
	const getPeriodLabel = (period: PeriodType): string => {
		switch (period) {
			case "week":
				return t("rsvp_stat_this_week") || "This Week";
			case "month":
				return t("rsvp_stat_this_month") || "This Month";
			case "year":
				return t("rsvp_stat_this_year") || "This Year";
			case "all":
				return t("rsvp_stat_all") || "All";
			default:
				return t("rsvp_stat_this_month") || "This Month";
		}
	};

	const periodLabel = getPeriodLabel(periodType);

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
			href: `/storeAdmin/${params.storeId}/rsvp/history`,
			color: "text-orange-600",
		},
		{
			title: t("rsvp_stat_facility_usage") || "Facility Usage",
			value: formatCurrency(totalFacilityRevenue),
			subValues: facilityStatsDisplay.length > 0 ? facilityStatsDisplay : [],
			icon: IconCalendar,
			href: `/storeAdmin/${params.storeId}/rsvp`,
			color: "text-blue-600",
		},
		{
			title: t("rsvp_stat_service_staff") || "Service Staff",
			value: formatCurrency(totalServiceStaffRevenue),
			subValues:
				serviceStaffStatsDisplay.length > 0 ? serviceStaffStatsDisplay : [],
			icon: IconCurrencyDollar,
			href: `/storeAdmin/${params.storeId}/rsvp`,
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
		<div className="mt-4 p-2 sm:p-4 border rounded-lg bg-muted/30">
			{/* Period Toggle Buttons (same as RsvpHistoryClient) */}
			<div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
				<Button
					variant={periodType === "week" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("week")}
					className="h-10 sm:h-9"
				>
					{t("rsvp_stat_this_week") || "This Week"}
				</Button>
				<Button
					variant={periodType === "month" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("month")}
					className="h-10 sm:h-9"
				>
					{t("rsvp_stat_this_month") || "This Month"}
				</Button>
				<Button
					variant={periodType === "year" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("year")}
					className="h-10 sm:h-9"
				>
					{t("rsvp_stat_this_year") || "This Year"}
				</Button>
				<Button
					variant={periodType === "all" ? "default" : "outline"}
					size="sm"
					onClick={() => handlePeriodChange("all")}
					className="h-10 sm:h-9"
				>
					{t("rsvp_stat_all") || "All"}
				</Button>
			</div>
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
