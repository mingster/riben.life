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
import { useParams } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { toastSuccess, toastError } from "@/components/toaster";

import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	dateToEpoch,
	convertToUtc,
	formatUtcDateToDateTimeLocal,
	epochToDate,
} from "@/utils/datetime-utils";
import { createRsvpColumns } from "./columns";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { completeRsvpsAction } from "@/actions/storeAdmin/rsvp/complete-rsvps";

interface RsvpHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
	rsvpSettings?: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
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
	const params = useParams<{ storeId: string }>();

	const [allData, setAllData] = useState<Rsvp[]>(serverData);
	const [periodType, setPeriodType] = useState<PeriodType>("custom");
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);
	const [selectedStatuses, setSelectedStatuses] = useState<RsvpStatus[]>([
		RsvpStatus.ReadyToConfirm,
	]);
	const [confirmingAll, setConfirmingAll] = useState(false);
	const [completingAll, setCompletingAll] = useState(false);

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

	// Filter data based on date range and status
	const data = useMemo(() => {
		let filtered = allData;

		// Filter by date range
		if (startDate && endDate) {
			const startEpoch = dateToEpoch(startDate);
			const endEpoch = dateToEpoch(endDate);

			if (startEpoch && endEpoch) {
				filtered = filtered.filter((rsvp) => {
					const rsvpTime = rsvp.rsvpTime;
					if (!rsvpTime) return false;

					// rsvpTime is BigInt epoch milliseconds
					const rsvpTimeBigInt =
						typeof rsvpTime === "bigint" ? rsvpTime : BigInt(rsvpTime);
					const startBigInt = startEpoch;
					const endBigInt = endEpoch;

					return rsvpTimeBigInt >= startBigInt && rsvpTimeBigInt <= endBigInt;
				});
			}
		}

		// Filter by selected statuses
		if (selectedStatuses.length > 0) {
			filtered = filtered.filter((rsvp) =>
				selectedStatuses.includes(rsvp.status),
			);
		}

		return filtered;
	}, [allData, startDate, endDate, selectedStatuses]);

	const handleDeleted = useCallback((rsvpId: string) => {
		setAllData((prev) => prev.filter((item) => item.id !== rsvpId));
	}, []);

	const handleUpdated = useCallback((updated: Rsvp) => {
		if (!updated) return;
		setAllData((prev) =>
			prev.map((item) => (item.id === updated.id ? updated : item)),
		);
	}, []);

	// Handle status filter toggle
	const handleStatusClick = useCallback((status: RsvpStatus) => {
		setSelectedStatuses((prev) => {
			if (prev.includes(status)) {
				// Remove status if already selected
				return prev.filter((s) => s !== status);
			} else {
				// Add status if not selected
				return [...prev, status];
			}
		});
	}, []);

	// Handle confirm all visible RSVPs with ReadyToConfirm status
	const handleConfirmAll = useCallback(async () => {
		// Get all visible RSVPs with ReadyToConfirm status
		const rsvpsToConfirm = data.filter(
			(rsvp) => rsvp.status === RsvpStatus.ReadyToConfirm,
		);

		if (rsvpsToConfirm.length === 0) {
			toastError({
				title: t("error_title") || "Error",
				description: t("no_rsvps_to_confirm") || "No reservations to confirm",
			});
			return;
		}

		setConfirmingAll(true);

		try {
			let successCount = 0;
			let errorCount = 0;

			// Confirm all RSVPs sequentially to avoid overwhelming the server
			for (const rsvp of rsvpsToConfirm) {
				try {
					// Convert rsvpTime from epoch to Date
					const rsvpTimeEpoch =
						typeof rsvp.rsvpTime === "number"
							? BigInt(rsvp.rsvpTime)
							: rsvp.rsvpTime instanceof Date
								? BigInt(rsvp.rsvpTime.getTime())
								: rsvp.rsvpTime;
					const rsvpTimeDate = epochToDate(rsvpTimeEpoch);

					if (!rsvpTimeDate) {
						errorCount++;
						continue;
					}

					// Convert arriveTime if it exists
					let arriveTimeDate: Date | null = null;
					if (rsvp.arriveTime) {
						const arriveTimeEpoch =
							typeof rsvp.arriveTime === "number"
								? BigInt(rsvp.arriveTime)
								: rsvp.arriveTime instanceof Date
									? BigInt(rsvp.arriveTime.getTime())
									: rsvp.arriveTime;
						arriveTimeDate = epochToDate(arriveTimeEpoch);
					}

					const result = await updateRsvpAction(String(params.storeId), {
						id: rsvp.id,
						customerId: rsvp.customerId || null,
						facilityId: rsvp.facilityId || "",
						numOfAdult: rsvp.numOfAdult || 1,
						numOfChild: rsvp.numOfChild || 0,
						rsvpTime: rsvpTimeDate,
						arriveTime: arriveTimeDate,
						status: RsvpStatus.Ready,
						message: rsvp.message || null,
						alreadyPaid: rsvp.alreadyPaid || false,
						confirmedByStore: true,
						confirmedByCustomer: rsvp.confirmedByCustomer || false,
						facilityCost: rsvp.facilityCost ? Number(rsvp.facilityCost) : null,
						pricingRuleId: rsvp.pricingRuleId || null,
					});

					if (result?.serverError) {
						errorCount++;
					} else if (result?.data?.rsvp) {
						successCount++;
						// Update local state
						handleUpdated(result.data.rsvp);
					} else {
						errorCount++;
					}
				} catch (error) {
					errorCount++;
				}
			}

			if (successCount > 0) {
				toastSuccess({
					title: t("rsvp_confirmed_by_store") || "Reservation Confirmed",
					description:
						successCount === rsvpsToConfirm.length
							? t("all_rsvps_confirmed", { count: successCount }) ||
								`All ${successCount} reservations confirmed`
							: t("rsvps_confirmed", {
									success: successCount,
									total: rsvpsToConfirm.length,
								}) ||
								`${successCount} of ${rsvpsToConfirm.length} reservations confirmed`,
				});
			}

			if (errorCount > 0) {
				toastError({
					title: t("error_title") || "Error",
					description:
						t("rsvps_confirmation_failed", { count: errorCount }) ||
						`Failed to confirm ${errorCount} reservation(s)`,
				});
			}
		} catch (error) {
			toastError({
				title: t("error_title") || "Error",
				description:
					error instanceof Error
						? error.message
						: t("failed_to_confirm_rsvps") || "Failed to confirm reservations",
			});
		} finally {
			setConfirmingAll(false);
		}
	}, [data, params.storeId, t, handleUpdated]);

	// Handle complete all visible RSVPs with Ready status
	const handleCompleteAll = useCallback(async () => {
		// Get all visible RSVPs with Ready status
		const rsvpsToComplete = data.filter(
			(rsvp) => rsvp.status === RsvpStatus.Ready,
		);

		if (rsvpsToComplete.length === 0) {
			toastError({
				title: t("error_title") || "Error",
				description: t("no_rsvps_to_complete") || "No reservations to complete",
			});
			return;
		}

		setCompletingAll(true);

		try {
			// Use bulk completion action
			const rsvpIds = rsvpsToComplete.map((rsvp) => rsvp.id);
			const result = await completeRsvpsAction(String(params.storeId), {
				rsvpIds,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title") || "Error",
					description: result.serverError,
				});
				return;
			}

			if (result?.data) {
				const { rsvps, completedCount, requestedCount } = result.data;

				// Update local state for all completed RSVPs
				if (rsvps && rsvps.length > 0) {
					for (const completedRsvp of rsvps) {
						handleUpdated(completedRsvp);
					}
				}

				// Show success message
				if (completedCount > 0) {
					toastSuccess({
						title: t("rsvp_completed") || "Reservation Completed",
						description:
							completedCount === requestedCount
								? t("all_rsvps_completed", { count: completedCount }) ||
									`All ${completedCount} reservations completed`
								: t("rsvps_completed", {
										success: completedCount,
										total: requestedCount,
									}) ||
									`${completedCount} of ${requestedCount} reservations completed`,
					});
				}

				// Show error message if some failed
				if (completedCount < requestedCount) {
					const failedCount = requestedCount - completedCount;
					toastError({
						title: t("error_title") || "Error",
						description:
							t("rsvps_completion_failed", { count: failedCount }) ||
							`Failed to complete ${failedCount} reservation(s)`,
					});
				}
			}
		} catch (error) {
			toastError({
				title: t("error_title") || "Error",
				description:
					error instanceof Error
						? error.message
						: t("failed_to_complete_rsvps") ||
							"Failed to complete reservations",
			});
		} finally {
			setCompletingAll(false);
		}
	}, [data, params.storeId, t, handleUpdated]);

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
				storeId: params.storeId,
				rsvpSettings,
			}),
		[
			t,
			handleDeleted,
			handleUpdated,
			storeTimezone,
			params.storeId,
			rsvpSettings,
		],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("rsvp_history") || "Reservation History"}
					badge={data.length}
					description=""
				/>
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
					{selectedStatuses.includes(RsvpStatus.ReadyToConfirm) && (
						<Button
							variant="default"
							size="sm"
							onClick={handleConfirmAll}
							disabled={
								confirmingAll ||
								data.filter((r) => r.status === RsvpStatus.ReadyToConfirm)
									.length === 0
							}
							className="h-10 sm:h-9"
						>
							<IconCheck className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
							{t("rsvp_confirm_all") || "Confirm All"}
						</Button>
					)}
					{selectedStatuses.includes(RsvpStatus.Ready) && (
						<Button
							variant="default"
							size="sm"
							onClick={handleCompleteAll}
							disabled={
								completingAll ||
								data.filter((r) => r.status === RsvpStatus.Ready).length === 0
							}
							className="h-10 sm:h-9"
						>
							<IconCheck className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
							{t("rsvp_complete_all") || "Complete All"}
						</Button>
					)}
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
			<RsvpStatusLegend
				t={t}
				selectedStatuses={selectedStatuses}
				onStatusClick={handleStatusClick}
			/>
		</>
	);
};
