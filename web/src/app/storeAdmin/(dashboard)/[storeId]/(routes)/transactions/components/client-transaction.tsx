"use client";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { cn, highlight_css } from "@/utils/utils";
import { OrderStatus } from "@/types/enum";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TransactionColumn } from "../transaction-column";
import { createTransactionColumns } from "./columns";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";

interface TransactionClientProps {
	serverData: TransactionColumn[];
	storeTimezone: string;
}

const sortTransactions = (items: TransactionColumn[]) =>
	[...items].sort(
		(a, b) =>
			new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime(),
	);

export function TransactionClient({
	serverData,
	storeTimezone,
}: TransactionClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const params = useParams<{ storeId: string }>();

	const columns = useMemo(
		() => createTransactionColumns(t, { storeId: params.storeId }),
		[t, params.storeId],
	);
	const statusKeys = useMemo(
		() =>
			Object.keys(OrderStatus)
				.filter((value) => !Number.isNaN(Number(value)))
				.map((value) => Number(value)),
		[],
	);

	const [allData, setAllData] = useState<TransactionColumn[]>(() =>
		sortTransactions(serverData),
	);
	useEffect(() => {
		setAllData(sortTransactions(serverData));
	}, [serverData]);

	const [statusFilter, setStatusFilter] = useState<number>(0);

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(storeTimezone);

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
		if (statusFilter === 0) {
			return allData;
		}
		return allData.filter((item) => item.orderStatus === statusFilter);
	}, [allData, statusFilter]);

	// Filter by period range (using updatedAtIso field)
	const timeFiltered = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return statusFiltered;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return statusFiltered;
		}

		return statusFiltered.filter((item) => {
			const updatedAtIso = item.updatedAtIso;
			if (!updatedAtIso) return false;

			// updatedAtIso is ISO string, convert to Date then to epoch
			const updatedAtDate = new Date(updatedAtIso);
			if (isNaN(updatedAtDate.getTime())) return false;

			const updatedAtEpoch = BigInt(updatedAtDate.getTime());

			return updatedAtEpoch >= startEpoch && updatedAtEpoch <= endEpoch;
		});
	}, [statusFiltered, periodRange]);

	const total = useMemo(() => {
		const sum = timeFiltered.reduce((acc, item) => acc + item.amount, 0);
		const refunds = timeFiltered.reduce(
			(acc, item) => acc + item.refundAmount,
			0,
		);
		return sum - refunds;
	}, [timeFiltered]);

	return (
		<>
			<Heading
				title={t("store_orders")}
				badge={timeFiltered.length}
				description=""
			/>

			<div className="flex flex-row justify-between  gap-3 sm:gap-4 py-3">
				<RsvpPeriodSelector
					storeTimezone={storeTimezone}
					storeId={params.storeId}
					onPeriodRangeChange={handlePeriodRangeChange}
					defaultPeriod="month"
					allowCustom={true}
				/>
				<div className="flex items-center gap-1.5 sm:gap-2">
					<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
						<Currency value={total} />
					</div>
				</div>
			</div>

			<DataTable<TransactionColumn, unknown>
				data={timeFiltered}
				columns={columns}
				searchKey="user"
			/>

			<div className="flex flex-wrap gap-1.5 sm:gap-2 pb-2">
				<Button
					className={cn("h-10 sm:h-9", statusFilter === 0 && highlight_css)}
					variant="outline"
					onClick={() => setStatusFilter(0)}
				>
					<span className="text-sm sm:text-xs">{t("all")}</span>
				</Button>
				{statusKeys.map((key) => (
					<Button
						key={key}
						className={cn("h-10 sm:h-9", statusFilter === key && highlight_css)}
						variant="outline"
						onClick={() => setStatusFilter(key)}
					>
						<span className="text-sm sm:text-xs">
							{t(`order_status_${OrderStatus[key]}`)}
						</span>
					</Button>
				))}
			</div>
		</>
	);
}
