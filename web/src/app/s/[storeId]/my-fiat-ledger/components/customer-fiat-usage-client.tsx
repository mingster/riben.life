"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfYear,
	endOfYear,
	subDays,
	addDays,
} from "date-fns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { DisplayFiatLedger } from "@/components/display-fiat-ledger";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CustomerFiatLedger } from "@/types";
import {
	dateToEpoch,
	convertToUtc,
	formatUtcDateToDateTimeLocal,
} from "@/utils/datetime-utils";

interface CustomerFiatUsageClientProps {
	ledger: CustomerFiatLedger[];
	storeTimezone: string;
	currency: string;
}

type PeriodType = "week" | "month" | "year" | "custom";

export const CustomerFiatUsageClient: React.FC<
	CustomerFiatUsageClientProps
> = ({ ledger, storeTimezone, currency }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [allData, setAllData] = useState<CustomerFiatLedger[]>(ledger);
	const [periodType, setPeriodType] = useState<PeriodType>("custom");
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	// Helper to get current date/time in store timezone
	const getNowInStoreTimezone = useCallback((): Date => {
		const now = new Date();
		// Format current UTC time to store timezone, then parse back
		// This gives us a Date object representing "now" in store timezone
		const formatted = formatUtcDateToDateTimeLocal(now, storeTimezone);
		if (!formatted) return now;
		// Convert back to UTC Date (interpreting the formatted string as store timezone)
		return convertToUtc(formatted, storeTimezone);
	}, [storeTimezone]);

	// Initialize default to past 10 days to future 30 days
	useEffect(() => {
		if (!startDate && !endDate) {
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

			// Create a Date object representing current time in store timezone
			const storeDate = new Date(year, month, day, hour, minute);

			// Calculate past 10 days and future 30 days
			const startDateLocal = subDays(storeDate, 10);
			const endDateLocal = addDays(storeDate, 30);

			// Convert to UTC (interpret as store timezone)
			const startStr = `${startDateLocal.getFullYear()}-${String(startDateLocal.getMonth() + 1).padStart(2, "0")}-${String(startDateLocal.getDate()).padStart(2, "0")}T00:00`;
			const endStr = `${endDateLocal.getFullYear()}-${String(endDateLocal.getMonth() + 1).padStart(2, "0")}-${String(endDateLocal.getDate()).padStart(2, "0")}T23:59`;

			setStartDate(convertToUtc(startStr, storeTimezone));
			setEndDate(convertToUtc(endStr, storeTimezone));
		}
	}, [startDate, endDate, storeTimezone, getNowInStoreTimezone]);

	// Update date range when period type changes
	const handlePeriodChange = useCallback(
		(period: PeriodType) => {
			setPeriodType(period);
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
				case "custom":
					// Keep current dates when switching to custom
					return;
				default:
					return;
			}

			// Convert period boundaries to UTC (interpret as store timezone)
			const startStr = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-${String(periodStart.getDate()).padStart(2, "0")}T00:00`;
			const endStr = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}-${String(periodEnd.getDate()).padStart(2, "0")}T23:59`;

			setStartDate(convertToUtc(startStr, storeTimezone));
			setEndDate(convertToUtc(endStr, storeTimezone));
		},
		[storeTimezone, getNowInStoreTimezone],
	);

	// Filter data based on date range
	const data = useMemo(() => {
		if (!startDate || !endDate) {
			return allData;
		}

		const startEpoch = dateToEpoch(startDate);
		const endEpoch = dateToEpoch(endDate);

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

			const startBigInt = startEpoch;
			const endBigInt = endEpoch;

			return createdAtBigInt >= startBigInt && createdAtBigInt <= endBigInt;
		});
	}, [allData, startDate, endDate]);

	// Format date for datetime-local input (display in store timezone)
	const formatDateForInput = useCallback(
		(date: Date | null): string => {
			if (!date) return "";
			// date is in UTC, format it to show in store timezone
			return formatUtcDateToDateTimeLocal(date, storeTimezone);
		},
		[storeTimezone],
	);

	// Parse datetime-local input to UTC Date (interpret input as store timezone)
	const parseDateFromInput = useCallback(
		(value: string): Date | null => {
			if (!value) return null;
			try {
				// Interpret the datetime-local string as store timezone and convert to UTC
				return convertToUtc(value, storeTimezone);
			} catch {
				return null;
			}
		},
		[storeTimezone],
	);

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
				{/* Period Toggle Buttons */}
				<div className="flex flex-wrap gap-1.5 sm:gap-2">
					<Button
						variant={periodType === "week" ? "default" : "outline"}
						size="sm"
						onClick={() => handlePeriodChange("week")}
						className="h-10 sm:h-9 touch-manipulation"
					>
						{t("this_week") || "This Week"}
					</Button>
					<Button
						variant={periodType === "month" ? "default" : "outline"}
						size="sm"
						onClick={() => handlePeriodChange("month")}
						className="h-10 sm:h-9 touch-manipulation"
					>
						{t("this_month") || "This Month"}
					</Button>
					<Button
						variant={periodType === "year" ? "default" : "outline"}
						size="sm"
						onClick={() => handlePeriodChange("year")}
						className="h-10 sm:h-9 touch-manipulation"
					>
						{t("this_year") || "This Year"}
					</Button>
				</div>

				{/* Date Range Inputs */}
				<div className="hidden sm:flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
						<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
							<label
								htmlFor="start-time"
								className="font-medium whitespace-nowrap"
							>
								{t("start_time") || "Start Time"}:
							</label>
							<Input
								id="start-time"
								type="datetime-local"
								value={formatDateForInput(startDate)}
								onChange={(e) => {
									const newDate = parseDateFromInput(e.target.value);
									if (newDate) {
										setStartDate(newDate);
										setPeriodType("custom");
									}
								}}
								className="h-10 text-base sm:sm:h-9 w-full sm:w-auto touch-manipulation"
							/>
						</div>
						<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
							<label
								htmlFor="end-time"
								className="font-medium whitespace-nowrap"
							>
								{t("end_time") || "End Time"}:
							</label>
							<Input
								id="end-time"
								type="datetime-local"
								value={formatDateForInput(endDate)}
								onChange={(e) => {
									const newDate = parseDateFromInput(e.target.value);
									if (newDate) {
										setEndDate(newDate);
										setPeriodType("custom");
									}
								}}
								className="h-10 text-base sm:sm:h-9 w-full sm:w-auto touch-manipulation"
							/>
						</div>
					</div>
				</div>
			</div>
			<Separator />
			<div className="py-3 sm:py-4">
				<DisplayFiatLedger ledger={data} currency={currency} />
			</div>
		</>
	);
};
