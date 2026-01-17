"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { toastSuccess, toastError } from "@/components/toaster";

import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { epochToDate } from "@/utils/datetime-utils";
import { createRsvpColumns } from "./columns";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { completeRsvpsAction } from "@/actions/storeAdmin/rsvp/complete-rsvps";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
} from "../../components/rsvp-period-selector";

interface RsvpHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
	rsvpSettings?: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
	} | null;
}

export const RsvpHistoryClient: React.FC<RsvpHistoryClientProps> = ({
	serverData,
	storeTimezone,
	rsvpSettings,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams<{ storeId: string }>();
	const searchParams = useSearchParams();

	const [allData, setAllData] = useState<Rsvp[]>(serverData);

	// Period range state (managed by RsvpPeriodSelector)
	const [periodRange, setPeriodRange] = useState<PeriodRangeWithDates>({
		periodType: "custom",
		startDate: null,
		endDate: null,
		startEpoch: null,
		endEpoch: null,
	});

	// Initialize statuses from URL parameter (only on mount)
	const [selectedStatuses, setSelectedStatuses] = useState<RsvpStatus[]>(() => {
		if (typeof window === "undefined") {
			return [RsvpStatus.ReadyToConfirm];
		}
		const rsvpStatusParam = searchParams.get("rsvp_status");
		if (rsvpStatusParam) {
			// Map URL parameter values to RsvpStatus enum
			const statusMap: Record<string, RsvpStatus> = {
				ready: RsvpStatus.Ready,
				"ready-to-confirm": RsvpStatus.ReadyToConfirm,
				completed: RsvpStatus.Completed,
				cancelled: RsvpStatus.Cancelled,
				"no-show": RsvpStatus.NoShow,
			};
			const status = statusMap[rsvpStatusParam.toLowerCase()];
			if (status) {
				return [status];
			}
		}
		// Default to ReadyToConfirm if no URL parameter
		return [RsvpStatus.ReadyToConfirm];
	});
	const [confirmingAll, setConfirmingAll] = useState(false);
	const [completingAll, setCompletingAll] = useState(false);

	// Handle period range change from RsvpPeriodSelector
	const handlePeriodRangeChange = useCallback((range: PeriodRangeWithDates) => {
		setPeriodRange(range);
	}, []);

	// Filter data based on date range and status
	const data = useMemo(() => {
		let filtered = allData;

		// Filter by date range (skip if period is "all" or dates are null)
		if (
			periodRange.periodType !== "all" &&
			periodRange.startEpoch &&
			periodRange.endEpoch
		) {
			filtered = filtered.filter((rsvp) => {
				const rsvpTime = rsvp.rsvpTime;
				if (!rsvpTime) return false;

				// rsvpTime is BigInt epoch milliseconds
				const rsvpTimeBigInt =
					typeof rsvpTime === "bigint" ? rsvpTime : BigInt(rsvpTime);
				const startBigInt = periodRange.startEpoch!;
				const endBigInt = periodRange.endEpoch!;

				return rsvpTimeBigInt >= startBigInt && rsvpTimeBigInt <= endBigInt;
			});
		}

		// Filter by selected statuses
		if (selectedStatuses.length > 0) {
			filtered = filtered.filter((rsvp) =>
				selectedStatuses.includes(rsvp.status),
			);
		}

		return filtered;
	}, [allData, periodRange, selectedStatuses]);

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

				//change selected status to ready
				setSelectedStatuses([RsvpStatus.Ready]);
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

					//change selected status to completed
					setSelectedStatuses([RsvpStatus.Completed]);
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
				{/* Period Selector with Custom Date Inputs */}
				<div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
					<RsvpPeriodSelector
						storeTimezone={storeTimezone}
						storeId={params.storeId}
						defaultPeriod="custom"
						allowCustom={true}
						onPeriodRangeChange={handlePeriodRangeChange}
					/>
					{/* Action Buttons */}
					<div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
						{
							//全部標記為「預約中」按鈕
							selectedStatuses.includes(RsvpStatus.ReadyToConfirm) &&
								data.filter((r) => r.status === RsvpStatus.ReadyToConfirm)
									.length > 0 && (
									<Button
										variant="default"
										size="sm"
										onClick={handleConfirmAll}
										disabled={confirmingAll}
										className="h-10 sm:h-9"
									>
										<IconCheck className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
										{t("rsvp_confirm_all") || "Confirm All"}
									</Button>
								)
						}
						{
							//全部標記為「已完成」按鈕
							selectedStatuses.includes(RsvpStatus.Ready) &&
								data.filter((r) => r.status === RsvpStatus.Ready).length >
									0 && (
									<Button
										variant="default"
										size="sm"
										onClick={handleCompleteAll}
										disabled={completingAll}
										className="h-10 sm:h-9"
									>
										<IconCheck className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
										{t("rsvp_complete_all") || "Complete All"}
									</Button>
								)
						}
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
