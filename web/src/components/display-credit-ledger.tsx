// display given credit ledger in a table

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CustomerCreditLedger } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";
import { Separator } from "@/components/ui/separator";

export const DisplayCreditLedger = ({
	ledger,
}: {
	ledger: CustomerCreditLedger[];
}) => {
	if (!ledger || ledger.length === 0) return null;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Get default timezone from first ledger entry's store, or default to "Asia/Taipei"
	const defaultTimezone = useMemo(() => {
		const firstLedger = ledger[0];
		return (
			firstLedger?.Store?.defaultTimezone ||
			firstLedger?.Store?.timezone ||
			"Asia/Taipei"
		);
	}, [ledger]);

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

	// Filter ledger entries based on period range (using createdAt field)
	const filteredLedger = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return ledger;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return ledger;
		}

		return ledger.filter((entry) => {
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
	}, [ledger, periodRange]);

	return (
		<div className="space-y-0 sm:space-y-0">
			{/* Period Selector */}

			<RsvpPeriodSelector
				storeTimezone={defaultTimezone}
				onPeriodRangeChange={handlePeriodRangeChange}
				defaultPeriod="month"
				allowCustom={true}
			/>

			<Separator />

			{/* Mobile: Card view */}
			<div className="block sm:hidden space-y-3">
				{filteredLedger.map((item) => (
					<div
						key={item.id}
						className="rounded-lg border bg-card p-3 sm:p-4 space-y-2"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<div className="sm:text-base truncate">
									{item.Store?.id ? (
										<Link
											href={`/s/${item.Store.id}`}
											className="hover:underline text-primary"
										>
											{item.Store.name}
										</Link>
									) : (
										<span className="text-muted-foreground">
											{item.Store?.name || "-"}
										</span>
									)}
								</div>
								<div className="text-muted-foreground">
									{format(item.createdAt, datetimeFormat)}
								</div>
							</div>
							<div className="shrink-0">
								<span
									className={`inline-flex items-center rounded-full px-2 py-1 ${
										item.type === "TOPUP"
											? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
											: item.type === "BONUS"
												? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
												: item.type === "SPEND"
													? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
													: item.type === "REFUND"
														? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
														: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
									}`}
								>
									{t(`customer_credit_type_${item.type}`)}
								</span>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2 border-t">
							<div className="space-y-1">
								<div className="text-muted-foreground">
									{t("customer_fiat_amount")}
								</div>
								<div
									className={cn(
										"font-bold text-base font-mono",
										Number(item.amount) >= 0
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400",
									)}
								>
									{new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: (
											item.Store?.defaultCurrency || "TWD"
										).toUpperCase(),
										maximumFractionDigits: 2,
										minimumFractionDigits: 0,
										signDisplay: "exceptZero",
									}).format(Number(item.amount))}
								</div>
							</div>

							<div className="space-y-1 text-right">
								<div className="text-muted-foreground">{t("balance")}</div>
								<div className="font-semibold text-base font-mono">
									{new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: (
											item.Store?.defaultCurrency || "TWD"
										).toUpperCase(),
										maximumFractionDigits: 2,
										minimumFractionDigits: 0,
									}).format(Number(item.balance))}
								</div>
							</div>
						</div>

						{item.note && (
							<div className="pt-2 border-t">
								<span className="text-muted-foreground">{t("note")}:</span>{" "}
								<span className="text-foreground">{item.note}</span>
							</div>
						)}

						{item.Creator?.name && (
							<div className="text-muted-foreground">
								<span className="font-medium">
									{t("customer_credit_creator")}:
								</span>{" "}
								{item.Creator.name}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Desktop: Table view */}
			<div className="hidden sm:block rounded-md border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse min-w-full">
						<thead>
							<tr className="bg-muted/50">
								<th className="text-left px-3 py-2 font-medium">
									{t("created_at")}
								</th>
								<th className="text-left px-3 py-2 font-medium">
									{t("store_name")}
								</th>
								<th className="text-left px-3 py-2 font-medium">
									{t("customer_credit_type")}
								</th>
								<th className="text-right px-3 py-2 font-medium">
									{t("customer_credit_amount")}
								</th>
								<th className="text-right px-3 py-2 font-medium">
									{t("balance")}
								</th>
								<th className="text-left px-3 py-2 font-medium">{t("note")}</th>
								<th className="text-left px-3 py-2 font-medium">
									{t("customer_credit_creator")}
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredLedger.map((item) => (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 font-mono">
										{format(item.createdAt, datetimeFormat)}
									</td>
									<td className="px-3 py-2">
										{item.Store?.id ? (
											<Link
												href={`/s/${item.Store.id}`}
												className="hover:underline text-primary"
											>
												{item.Store.name}
											</Link>
										) : (
											<span className="text-muted-foreground">
												{item.Store?.name || "-"}
											</span>
										)}
									</td>
									<td className="px-3 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 ${
												item.type === "TOPUP"
													? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
													: item.type === "BONUS"
														? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
														: item.type === "SPEND"
															? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
															: item.type === "REFUND"
																? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
																: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
											}`}
										>
											{t(`customer_credit_type_${item.type}`)}
										</span>
									</td>
									<td
										className={cn(
											"px-3 py-2 font-semibold font-mono text-right",
											Number(item.amount) >= 0
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400",
										)}
									>
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: (
												item.Store?.defaultCurrency || "TWD"
											).toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 0,
											signDisplay: "exceptZero",
										}).format(Number(item.amount))}
									</td>
									<td className="px-3 py-2 font-semibold font-mono text-right">
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: (
												item.Store?.defaultCurrency || "TWD"
											).toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 0,
										}).format(Number(item.balance))}
									</td>
									<td className="px-3 py-2 max-w-[200px] truncate">
										{item.note || "-"}
									</td>
									<td className="px-3 py-2">{item.Creator?.name || "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
