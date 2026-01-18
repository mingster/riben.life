"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useIsHydrated } from "@/hooks/use-hydrated";
import type { BalanceColumn } from "../balance-column";
import { createBalanceColumns } from "./columns";
import {
	RsvpPeriodSelector,
	type PeriodRangeWithDates,
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
	const isHydrated = useIsHydrated();

	const [allData] = useState<BalanceColumn[]>(serverData);

	// Initialize period range with placeholder values to avoid hydration mismatch
	// RsvpPeriodSelector will update this via onPeriodRangeChange after initialization
	// This ensures server and client render the same initial HTML (no date calculations during SSR)
	const [periodRange, setPeriodRange] = useState<PeriodRangeWithDates>(() => ({
		periodType: "month",
		startDate: null,
		endDate: null,
		startEpoch: null, // Will be set by RsvpPeriodSelector after hydration
		endEpoch: null, // Will be set by RsvpPeriodSelector after hydration
	}));

	// Track if RsvpPeriodSelector has initialized (notified parent with period range)
	const [isPeriodInitialized, setIsPeriodInitialized] = useState(false);

	// Handle period range change from RsvpPeriodSelector
	const handlePeriodRangeChange = useCallback((range: PeriodRangeWithDates) => {
		setPeriodRange(range);
		// Mark as initialized once we receive the first period range update
		setIsPeriodInitialized(true);
	}, []);

	// Wait for hydration before considering period initialized
	useEffect(() => {
		if (!isHydrated) {
			setIsPeriodInitialized(false);
		}
	}, [isHydrated]);

	// Filter data based on date range
	// Wait until period is initialized to avoid hydration mismatch
	const data = useMemo(() => {
		// If period is not initialized yet, return all data (matches server render)
		// This prevents hydration mismatch while waiting for RsvpPeriodSelector
		if (!isPeriodInitialized || !isHydrated) {
			return allData;
		}

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
	}, [allData, periodRange, isPeriodInitialized, isHydrated]);

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
