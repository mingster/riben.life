"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { DisplayFiatLedger } from "@/components/display-fiat-ledger";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";
import type { CustomerFiatLedger } from "@/types";

interface CustomerFiatUsageClientProps {
	ledger: CustomerFiatLedger[];
	storeTimezone: string;
	currency: string;
	storeId?: string;
}

export const CustomerFiatUsageClient: React.FC<
	CustomerFiatUsageClientProps
> = ({ ledger, storeTimezone, currency, storeId }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [allData, setAllData] = useState<CustomerFiatLedger[]>(ledger);

	// Update allData when ledger prop changes
	useEffect(() => {
		setAllData(ledger);
	}, [ledger]);

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(storeTimezone);

	// Initialize period range with default "month" period epoch values
	// This ensures the component is valid immediately, and RsvpPeriodSelector will update it
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

	// Filter data based on period range
	const data = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return allData;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return allData;
		}

		return allData.filter((entry) => {
			const createdAt = entry.createdAt;
			if (!createdAt) return false;

			// createdAt is Date or BigInt epoch milliseconds
			let createdAtBigInt: bigint;
			if (createdAt instanceof Date) {
				createdAtBigInt = BigInt(createdAt.getTime());
			} else if (typeof createdAt === "bigint") {
				createdAtBigInt = createdAt;
			} else if (typeof createdAt === "number") {
				createdAtBigInt = BigInt(createdAt);
			} else {
				return false;
			}

			return createdAtBigInt >= startEpoch && createdAtBigInt <= endEpoch;
		});
	}, [allData, periodRange]);

	return (
		<>
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("my_fiat_ledger") || "Fiat Ledger"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<div className="flex flex-col gap-3 sm:gap-4 py-3">
				<RsvpPeriodSelector
					storeTimezone={storeTimezone}
					storeId={storeId}
					onPeriodRangeChange={handlePeriodRangeChange}
					defaultPeriod="month"
					allowCustom={true}
				/>
			</div>
			<Separator />
			<div className="py-3 sm:py-4">
				<DisplayFiatLedger ledger={data} currency={currency} />
			</div>
		</>
	);
};
