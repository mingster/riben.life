"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { OrderStatus } from "@/types/enum";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DisplayOrders } from "@/components/display-orders";
import { authClient } from "@/lib/auth-client";
import type { StoreOrder } from "@/types";
import { cn, highlight_css } from "@/utils/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";
import { Separator } from "@/components/ui/separator";

type props = { orders: StoreOrder[] | [] };

export const OrderTab = ({ orders }: props) => {
	const { data: session } = authClient.useSession();
	const searchParams = useSearchParams();
	const initialTab = searchParams.get("ordertab");
	const [_activeTab, setActiveTab] = useState(
		initialTab || OrderStatus[OrderStatus.Pending],
	);

	const _handleTabChange = (value: string) => {
		//update the state
		setActiveTab(value);
		// update the URL query parameter
		//router.push({ query: { tab: value } });
	};

	// if the query parameter changes, update the state
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// orderStatus numeric key
	const keys = Object.keys(OrderStatus).filter((v) => !Number.isNaN(Number(v)));

	const [filterStatus, setFilterStatus] = useState(0); //0 = all

	// Get default timezone from first order's store, or default to "Asia/Taipei"
	const defaultTimezone = useMemo(() => {
		const firstOrder = orders[0];
		return (
			firstOrder?.Store?.defaultTimezone ||
			firstOrder?.Store?.timezone ||
			"Asia/Taipei"
		);
	}, [orders]);

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(defaultTimezone);

	// Initialize period range with default "month" period epoch values
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

	// Filter by status first
	const statusFiltered = useMemo(() => {
		if (filterStatus === 0) {
			return orders;
		}
		return orders.filter((d) => d.orderStatus === filterStatus);
	}, [orders, filterStatus]);

	// Filter by period range (using updatedAt field)
	const periodFiltered = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return statusFiltered;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return statusFiltered;
		}

		return statusFiltered.filter((order) => {
			const updatedAt = order.updatedAt;
			if (!updatedAt) return false;

			// updatedAt is Date or BigInt epoch milliseconds
			let updatedAtBigInt: bigint;
			if (updatedAt instanceof Date) {
				updatedAtBigInt = BigInt(updatedAt.getTime());
			} else if (typeof updatedAt === "bigint") {
				updatedAtBigInt = updatedAt;
			} else if (typeof updatedAt === "number") {
				updatedAtBigInt = BigInt(updatedAt);
			} else {
				return false;
			}

			return updatedAtBigInt >= startEpoch && updatedAtBigInt <= endEpoch;
		});
	}, [statusFiltered, periodRange]);

	//sort orders by orderNum
	const result = useMemo(() => {
		return [...periodFiltered].sort(
			(a, b) => (b.orderNum ?? 0) - (a.orderNum ?? 0),
		);
	}, [periodFiltered]);

	return (
		<Card>
			<CardContent className="space-y-0 p-0">
				<div className="flex flex-col gap-3 sm:gap-4 py-3 px-4">
					<RsvpPeriodSelector
						storeTimezone={defaultTimezone}
						onPeriodRangeChange={handlePeriodRangeChange}
						defaultPeriod="month"
						allowCustom={true}
					/>
				</div>

				<DisplayOrders orders={result} />
				<Separator />

				<div className="flex flex-wrap gap-1.5 py-3 px-4">
					<Button
						className={cn(
							"h-10 sm:h-9 sm:text-xs",
							filterStatus === 0 && highlight_css,
						)}
						variant="outline"
						onClick={() => {
							setFilterStatus(0);
						}}
					>
						ALL
					</Button>
					{keys.map((key) => (
						<Button
							key={key}
							className={cn(
								"h-10 sm:h-9 sm:text-xs",
								filterStatus === Number(key) && highlight_css,
							)}
							variant="outline"
							onClick={() => {
								setFilterStatus(Number(key));
							}}
						>
							{t(`order_status_${OrderStatus[Number(key)]}`)}
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	);
};
