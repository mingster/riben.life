"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfYear,
	endOfYear,
} from "date-fns";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { Rsvp } from "@/types";
import {
	getDateInTz,
	getOffsetHours,
	dateToEpoch,
	convertToUtc,
	formatUtcDateToDateTimeLocal,
} from "@/utils/datetime-utils";
import { createRsvpColumns } from "./columns";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

interface RsvpHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
	rsvpSettings?: {
		prepaidRequired?: boolean | null;
	} | null;
}

type PeriodType = "week" | "month" | "year" | "custom";

export const RsvpHistoryClient: React.FC<RsvpHistoryClientProps> = ({
	serverData,
	storeTimezone,
	rsvpSettings,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [allData, setAllData] = useState<Rsvp[]>(serverData);
	const [periodType, setPeriodType] = useState<PeriodType>("week");
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	// Get timezone offset
	const offsetHours = useMemo(
		() => getOffsetHours(storeTimezone),
		[storeTimezone],
	);

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

	// Initialize default to "this week"
	useEffect(() => {
		if (periodType === "week" && !startDate && !endDate) {
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
			// We'll use this to calculate week boundaries
			const storeDate = new Date(year, month, day, hour, minute);
			const weekStart = startOfWeek(storeDate, { weekStartsOn: 0 }); // Sunday
			const weekEnd = endOfWeek(storeDate, { weekStartsOn: 0 }); // Saturday

			// Convert week boundaries to UTC (interpret as store timezone)
			const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}T00:00`;
			const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}T23:59`;

			setStartDate(convertToUtc(weekStartStr, storeTimezone));
			setEndDate(convertToUtc(weekEndStr, storeTimezone));
		}
	}, [periodType, startDate, endDate, storeTimezone, getNowInStoreTimezone]);

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

		return allData.filter((rsvp) => {
			const rsvpTime = rsvp.rsvpTime;
			if (!rsvpTime) return false;

			// rsvpTime is BigInt epoch milliseconds
			const rsvpTimeBigInt =
				typeof rsvpTime === "bigint" ? rsvpTime : BigInt(rsvpTime);
			const startBigInt = startEpoch;
			const endBigInt = endEpoch;

			return rsvpTimeBigInt >= startBigInt && rsvpTimeBigInt <= endBigInt;
		});
	}, [allData, startDate, endDate]);

	const handleCreated = useCallback((newRsvp: Rsvp) => {
		if (!newRsvp) return;
		setAllData((prev) => {
			const exists = prev.some((item) => item.id === newRsvp.id);
			if (exists) return prev;
			return [newRsvp, ...prev];
		});
	}, []);

	const handleDeleted = useCallback((rsvpId: string) => {
		setAllData((prev) => prev.filter((item) => item.id !== rsvpId));
	}, []);

	const handleUpdated = useCallback((updated: Rsvp) => {
		if (!updated) return;
		setAllData((prev) =>
			prev.map((item) => (item.id === updated.id ? updated : item)),
		);
	}, []);

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

	const columns = useMemo(
		() =>
			createRsvpColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
				storeTimezone,
				rsvpSettings,
			}),
		[t, handleDeleted, handleUpdated, storeTimezone, rsvpSettings],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("rsvp_history") || "Reservation History"}
					badge={data.length}
					description=""
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<AdminEditRsvpDialog
						isNew
						onCreated={handleCreated}
						storeTimezone={storeTimezone}
						rsvpSettings={rsvpSettings}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
				{/* Period Toggle Buttons */}
				<div className="flex flex-wrap gap-1.5 sm:gap-2">
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
				</div>

				{/* Date Range Inputs */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
						<label
							htmlFor="start-time"
							className="text-sm font-medium whitespace-nowrap"
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
							className="h-10 text-base sm:text-sm sm:h-9 w-full sm:w-auto"
						/>
					</div>
					<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
						<label
							htmlFor="end-time"
							className="text-sm font-medium whitespace-nowrap"
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
							className="h-10 text-base sm:text-sm sm:h-9 w-full sm:w-auto"
						/>
					</div>
				</div>
			</div>
			<Separator />
			<DataTable<Rsvp, unknown>
				columns={columns}
				data={data}
				searchKey="message"
			/>
		</>
	);
};
