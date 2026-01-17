"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { BalanceColumn } from "../balance-column";
import { createBalanceColumns } from "./columns";
import {
	RsvpPeriodSelector,
	type PeriodRangeWithDates,
	useRsvpPeriodRanges,
} from "../../components/rsvp-period-selector";

interface BalanceClientProps {
	serverData: BalanceColumn[];
	storeTimezone: string;
}

const sortBalances = (items: BalanceColumn[]) =>
	[...items].sort(
		(a, b) =>
			new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime(),
	);

export function BalanceClient({
	serverData,
	storeTimezone,
}: BalanceClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const params = useParams<{ storeId: string }>();

	const [allData] = useState<BalanceColumn[]>(serverData);

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(storeTimezone);

	// Initialize period range with default period epoch values
	// This ensures the period range is valid immediately, and RsvpPeriodSelector will update it
	// with the correct values (from localStorage or user selection) via onPeriodRangeChange
	// Use "month" as default (matching RSVP history) for better UX
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

	// Filter data based on date range
	const data = useMemo(() => {
		let filtered = allData;

		// Filter by date range (skip if period is "all" or dates are null)
		if (
			periodRange.periodType !== "all" &&
			periodRange.startEpoch &&
			periodRange.endEpoch
		) {
			filtered = filtered.filter((balance) => {
				// createdAtIso is an ISO string, convert to Date then to epoch for comparison
				const createdAtDate = balance.createdAtIso
					? new Date(balance.createdAtIso)
					: null;

				if (!createdAtDate || isNaN(createdAtDate.getTime())) {
					return false;
				}

				// Convert Date to epoch milliseconds (BigInt)
				const createdAtEpoch = BigInt(createdAtDate.getTime());
				const startBigInt = periodRange.startEpoch!;
				const endBigInt = periodRange.endEpoch!;

				return createdAtEpoch >= startBigInt && createdAtEpoch <= endBigInt;
			});
		}

		// Sort filtered data by date (most recent first)
		return sortBalances(filtered);
	}, [allData, periodRange]);

	const columns = useMemo(() => createBalanceColumns(t), [t]);

	return (
		<>
			<Heading title={t("balances")} badge={data.length} description="" />
			<Separator />
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
				<RsvpPeriodSelector
					storeTimezone={storeTimezone}
					storeId={params.storeId}
					defaultPeriod="month"
					allowCustom={true}
					onPeriodRangeChange={handlePeriodRangeChange}
				/>
			</div>
			<Separator />
			<DataTable<BalanceColumn, unknown>
				data={data}
				columns={columns}
				searchKey="description"
			/>
		</>
	);
}
