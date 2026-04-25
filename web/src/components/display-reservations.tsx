// display given reservations in a table

"use client";

import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { getRsvpSettingsAction } from "@/actions/store/reservation/get-rsvp-settings";
import { getStoreDataAction } from "@/actions/store/reservation/get-store-data";
import { useTranslation } from "@/app/i18n/client";
import { ReservationDialog } from "@/app/s/[storeId]/reservation/components/reservation-dialog";
import { RsvpCancelDeleteDialog } from "@/app/s/[storeId]/reservation/components/rsvp-cancel-delete-dialog";
import { createCustomerRsvpColumns } from "@/components/customer-rsvp-columns";
import { DataTable } from "@/components/dataTable";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
} from "@/components/rsvp-period-selector";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { toastError, toastSuccess } from "@/components/toaster";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import type { CustomSessionUser } from "@/lib/auth";
import type { StoreCustomerManageUser } from "@/lib/store-admin/get-store-customer-profile-for-manage";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { RsvpStatus } from "@/types/enum";
import { epochToDate, toBigIntEpochUnknown } from "@/utils/datetime-utils";
import { formatStoreCalendarLocation } from "@/utils/format-store-calendar-location";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	canCancelReservation as canCancelReservationUtil,
	canEditReservation as canEditReservationUtil,
	formatRsvpTime as formatRsvpTimeUtil,
	isUserReservation as isUserReservationUtil,
	type SerializedRsvpForStorage,
} from "@/utils/rsvp-utils";

/** Stable references for status filter — must not be recreated each render (useEffect deps). */
const RSVP_STATUS_FILTER_VALID: readonly RsvpStatus[] = [
	RsvpStatus.Pending,
	RsvpStatus.ReadyToConfirm,
	RsvpStatus.Ready,
	RsvpStatus.Completed,
	RsvpStatus.Cancelled,
	RsvpStatus.NoShow,
] as const;

const RSVP_DEFAULT_STATUS_FILTER: readonly RsvpStatus[] = [
	RsvpStatus.Ready,
	RsvpStatus.ReadyToConfirm,
] as const;

function isValidRsvpStatusFilterValue(n: number): n is RsvpStatus {
	return (RSVP_STATUS_FILTER_VALID as readonly number[]).includes(n);
}

export interface DisplayReservationsProps {
	reservations: Rsvp[];
	user?: User | StoreCustomerManageUser | CustomSessionUser | null;
	hideActions?: boolean;
	/** Store mode: single-store context (store history page) */
	storeId?: string;
	storeTimezone?: string;
	rsvpSettings?: RsvpSettings | null;
	storeSettings?: StoreSettings | null;
	facilities?: StoreFacility[];
	storeCurrency?: string;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
	/** Show status filter (store history) */
	showStatusFilter?: boolean;
	/** Show checkout buttons (store history) */
	showCheckout?: boolean;
	/** Show heading with badge (store history) */
	showHeading?: boolean;
	/** Callback when reservation is deleted (for local state update) */
	onReservationDeleted?: (id: string) => void;
	/** Callback when reservation is updated/cancelled (for local state update) */
	onReservationUpdated?: (rsvp: Rsvp) => void;
	/** For anonymous users: reservations from localStorage (passed by parent) */
	localStorageReservations?: SerializedRsvpForStorage[];
	/** Callback when reservation removed from localStorage (anonymous) */
	onRemoveFromLocalStorage?: (reservationId: string) => void;
	/** Store reservation history: show Google Calendar + ICS column */
	showCalendarExport?: boolean;
	/**
	 * Store admin reservation list: treat staff as able to act on any reservation
	 * for edit/cancel eligibility (still subject to status and cancel window in utils).
	 */
	storeAdminList?: boolean;
}

/**
 * Display all RSVPs for the signed-in user, regardless of status.
 * Shows: Pending, Ready, Completed, Cancelled, NoShow, and any other statuses.
 * Supports account mode (multi-store) and store mode (single-store history page).
 */
export const DisplayReservations = ({
	reservations,
	user,
	hideActions = false,
	storeId,
	storeTimezone = "Asia/Taipei",
	rsvpSettings,
	storeSettings = null,
	facilities = [],
	storeCurrency = "twd",
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
	showStatusFilter = false,
	showCheckout = false,
	showHeading = false,
	onReservationDeleted,
	onReservationUpdated,
	localStorageReservations = [],
	onRemoveFromLocalStorage,
	showCalendarExport = false,
	storeAdminList = false,
}: DisplayReservationsProps) => {
	const router = useRouter();
	const isStoreMode = Boolean(storeId && rsvpSettings !== undefined);
	const isEmpty = !reservations || reservations.length === 0;

	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [reservationToCancel, setReservationToCancel] = useState<Rsvp | null>(
		null,
	);
	const [isCancelling, setIsCancelling] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [reservationToEdit, setReservationToEdit] = useState<Rsvp | null>(null);
	const [storeData, setStoreData] = useState<{
		rsvpSettings: RsvpSettings | null;
		storeSettings: StoreSettings | null;
		facilities: StoreFacility[];
	} | null>(null);
	const [_isLoadingStoreData, setIsLoadingStoreData] = useState(false);
	const [rsvpSettingsCache, setRsvpSettingsCache] = useState<
		Map<string, RsvpSettings | null>
	>(new Map());

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Get default timezone from first reservation's store, or default to "Asia/Taipei"
	const defaultTimezone = useMemo(() => {
		const firstReservation = reservations[0];
		return firstReservation?.Store?.defaultTimezone || "Asia/Taipei";
	}, [reservations]);

	// Initialize period range - default to "all" (no date filter)
	const initialPeriodRange = useMemo<PeriodRangeWithDates>(
		() => ({
			periodType: "all",
			startDate: null,
			endDate: null,
			startEpoch: null,
			endEpoch: null,
		}),
		[],
	);

	const [periodRange, setPeriodRange] =
		useState<PeriodRangeWithDates>(initialPeriodRange);

	// Status filter (toggle status badges to filter; works in both account and store modes)
	const STATUS_FILTER_STORAGE_KEY = showStatusFilter
		? `rsvp-history-status-${storeId || "account"}`
		: "";
	const [selectedStatuses, setSelectedStatuses] = useState<RsvpStatus[]>(() => {
		if (!showStatusFilter || typeof window === "undefined")
			return [...RSVP_DEFAULT_STATUS_FILTER];
		try {
			const stored = localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as number[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					const valid = parsed.filter(isValidRsvpStatusFilterValue);
					if (valid.length > 0) return valid;
				}
			}
		} catch {
			// ignore
		}
		return [...RSVP_DEFAULT_STATUS_FILTER];
	});

	useEffect(() => {
		if (!showStatusFilter) return;
		try {
			localStorage.setItem(
				STATUS_FILTER_STORAGE_KEY,
				JSON.stringify(selectedStatuses),
			);
		} catch {
			// ignore
		}
	}, [selectedStatuses, STATUS_FILTER_STORAGE_KEY, showStatusFilter]);

	useEffect(() => {
		if (!showStatusFilter || !STATUS_FILTER_STORAGE_KEY) return;
		try {
			const stored = localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as number[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					const valid = parsed.filter(isValidRsvpStatusFilterValue);
					if (valid.length > 0) {
						setSelectedStatuses((prev) => {
							if (
								prev.length === valid.length &&
								prev.every((s, i) => s === valid[i])
							) {
								return prev;
							}
							return valid;
						});
						return;
					}
				}
			}
		} catch {
			// ignore
		}
		setSelectedStatuses((prev) => {
			const next = [...RSVP_DEFAULT_STATUS_FILTER];
			if (prev.length === next.length && prev.every((s, i) => s === next[i])) {
				return prev;
			}
			return next;
		});
	}, [STATUS_FILTER_STORAGE_KEY, showStatusFilter]);

	const handleStatusClick = useCallback((status: RsvpStatus) => {
		setSelectedStatuses((prev) => {
			if (prev.includes(status)) return prev.filter((s) => s !== status);
			return [...prev, status];
		});
	}, []);

	const handleResetToDefaults = useCallback(() => {
		setSelectedStatuses([...RSVP_DEFAULT_STATUS_FILTER]);
		if (STATUS_FILTER_STORAGE_KEY) {
			try {
				localStorage.setItem(
					STATUS_FILTER_STORAGE_KEY,
					JSON.stringify([...RSVP_DEFAULT_STATUS_FILTER]),
				);
			} catch {
				// ignore
			}
		}
	}, [STATUS_FILTER_STORAGE_KEY]);

	// Handle period range change from RsvpPeriodSelector
	const handlePeriodRangeChange = useCallback((range: PeriodRangeWithDates) => {
		setPeriodRange(range);
	}, []);

	// Filter reservations based on period range (using rsvpTime field)
	const filteredReservations = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return reservations;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return reservations;
		}

		return reservations.filter((rsvp) => {
			const rsvpTime = rsvp.rsvpTime;
			if (!rsvpTime) return false;

			// rsvpTime is BigInt epoch milliseconds
			const rsvpTimeBigInt = toBigIntEpochUnknown(rsvpTime);
			if (!rsvpTimeBigInt) {
				return false;
			}

			return rsvpTimeBigInt >= startEpoch && rsvpTimeBigInt <= endEpoch;
		});
	}, [reservations, periodRange]);

	// Apply status filter (when showStatusFilter: only show reservations with selected statuses)
	const periodFilteredReservations = filteredReservations;
	const statusFilteredReservations = useMemo(() => {
		if (!showStatusFilter || selectedStatuses.length === 0) {
			return periodFilteredReservations;
		}
		return periodFilteredReservations.filter((rsvp) =>
			selectedStatuses.includes(rsvp.status),
		);
	}, [periodFilteredReservations, showStatusFilter, selectedStatuses]);

	// Sort filtered reservations by rsvpTime (ascending - earliest first)
	const sortedReservations = useMemo(() => {
		return [...statusFilteredReservations].sort((a, b) => {
			// Helper to convert rsvpTime to number (epoch milliseconds)
			const getRsvpTimeValue = (rsvp: Rsvp): number => {
				const epoch = toBigIntEpochUnknown(rsvp.rsvpTime);
				return epoch ? Number(epoch) : 0;
			};

			const timeA = getRsvpTimeValue(a);
			const timeB = getRsvpTimeValue(b);
			return timeA - timeB;
		});
	}, [statusFilteredReservations]);

	// Check if reservation belongs to current user (account mode) or user/localStorage (store mode)
	const isUserReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (storeAdminList) {
				return true;
			}
			if (isStoreMode) {
				return isUserReservationUtil(
					rsvp,
					user ?? null,
					localStorageReservations,
				);
			}
			if (!user) return false;
			if (user.id && rsvp.customerId) return user.id === rsvp.customerId;
			if (user.email && rsvp.Customer?.email) {
				return user.email === rsvp.Customer.email;
			}
			return false;
		},
		[isStoreMode, user, localStorageReservations, storeAdminList],
	);

	// Check if reservation can be edited
	const canEditReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (isStoreMode && rsvpSettings) {
				return canEditReservationUtil(rsvp, rsvpSettings, isUserReservation);
			}
			// Account mode: use same logic as store mode via per-store RsvpSettings cache
			const cached = rsvp.Store?.id
				? rsvpSettingsCache.get(rsvp.Store.id)
				: undefined;
			if (cached !== undefined) {
				return canEditReservationUtil(rsvp, cached, isUserReservation);
			}
			return false;
		},
		[isStoreMode, rsvpSettings, isUserReservation, rsvpSettingsCache],
	);

	// Pre-fetch RsvpSettings for all unique stores (account mode only)
	useEffect(() => {
		if (isStoreMode) return;
		const uniqueStoreIds = [
			...new Set(
				periodFilteredReservations
					.map((r) => r.Store?.id)
					.filter((id): id is string => Boolean(id)),
			),
		];

		const fetchAllRsvpSettings = async () => {
			const promises = uniqueStoreIds.map(async (storeId) => {
				// Check cache using functional update to avoid stale closure
				let shouldFetch = false;
				setRsvpSettingsCache((prev) => {
					if (prev.has(storeId)) {
						return prev; // Already cached
					}
					shouldFetch = true;
					return prev;
				});

				if (!shouldFetch) {
					return;
				}

				try {
					const result = await getRsvpSettingsAction({ storeId });
					if (
						!result?.serverError &&
						result?.data?.rsvpSettings !== undefined
					) {
						setRsvpSettingsCache((prev) => {
							// Check again in case another request already cached it
							if (prev.has(storeId)) {
								return prev;
							}
							const newMap = new Map(prev);
							newMap.set(storeId, result.data?.rsvpSettings);
							return newMap;
						});
					}
				} catch (error) {
					// Silently fail - will default to not allowing cancellation
					console.error(
						`Failed to fetch RsvpSettings for store ${storeId}:`,
						error,
					);
				}
			});

			await Promise.all(promises);
		};

		if (uniqueStoreIds.length > 0) {
			fetchAllRsvpSettings();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [periodFilteredReservations, isStoreMode]);

	// Check if reservation can be cancelled/deleted
	const canCancelReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			if (isStoreMode && rsvpSettings) {
				return canCancelReservationUtil(rsvp, rsvpSettings, isUserReservation);
			}
			// Account mode: use same logic as store mode via per-store RsvpSettings cache
			const cached = rsvp.Store?.id
				? rsvpSettingsCache.get(rsvp.Store.id)
				: undefined;
			if (cached !== undefined) {
				return canCancelReservationUtil(rsvp, cached, isUserReservation);
			}
			return false;
		},
		[isStoreMode, rsvpSettings, isUserReservation, rsvpSettingsCache],
	);

	const handleCancelClick = useCallback((rsvp: Rsvp) => {
		setReservationToCancel(rsvp);
		setCancelDialogOpen(true);
	}, []);

	// Store mode: handleCancelClick for DataTable columns (e, rsvp) signature
	const handleCancelClickWithEvent = useCallback(
		(e: React.MouseEvent, rsvp: Rsvp) => {
			e.stopPropagation();
			handleCancelClick(rsvp);
		},
		[handleCancelClick],
	);

	const handleCheckoutClick = useCallback(
		(orderId: string) => {
			router.push(`/checkout/${orderId}`);
		},
		[router],
	);

	const handleCancelConfirm = async () => {
		if (!reservationToCancel) return;

		setIsCancelling(true);
		try {
			const isDelete =
				reservationToCancel.status === RsvpStatus.Pending ||
				reservationToCancel.status === RsvpStatus.ReadyToConfirm;

			if (isDelete) {
				const result = await deleteReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({ description: t("reservation_deleted") });
					if (onReservationDeleted) {
						onReservationDeleted(reservationToCancel.id);
						onRemoveFromLocalStorage?.(reservationToCancel.id);
					} else if (typeof window !== "undefined") {
						window.location.reload();
					}
				}
			} else {
				const storeIdForCancel = storeId ?? reservationToCancel.Store?.id;
				if (!storeIdForCancel) {
					toastError({
						title: t("error"),
						description: "Store ID is required",
					});
					return;
				}

				const result = await cancelReservationAction({
					id: reservationToCancel.id,
					storeId: storeIdForCancel,
				});

				if (result?.serverError) {
					toastError({
						title: t("error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({ description: t("reservation_cancelled") });
					if (onReservationUpdated && result?.data?.rsvp) {
						const updated = result.data.rsvp;
						const normalized = {
							...updated,
							rsvpTime: toBigIntEpochUnknown(updated.rsvpTime) ?? BigInt(0),
							createdAt: toBigIntEpochUnknown(updated.createdAt) ?? BigInt(0),
							updatedAt: toBigIntEpochUnknown(updated.updatedAt) ?? BigInt(0),
						};
						onReservationUpdated(normalized);
					} else if (typeof window !== "undefined") {
						window.location.reload();
					}
				}
			}
		} catch (error) {
			toastError({
				title: t("error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsCancelling(false);
			setCancelDialogOpen(false);
			setReservationToCancel(null);
		}
	};

	const handleEditClick = async (rsvp: Rsvp) => {
		const storeIdForEdit = storeId ?? rsvp.Store?.id;
		if (!storeIdForEdit) return;

		// Store admin history: clicking ReadyToConfirm confirms reservation directly.
		if (storeAdminList && rsvp.status === RsvpStatus.ReadyToConfirm) {
			const rsvpTimeEpoch = toBigIntEpochUnknown(rsvp.rsvpTime);
			const rsvpTimeDate = epochToDate(rsvpTimeEpoch);
			if (!rsvpTimeDate) {
				toastError({
					title: t("error"),
					description:
						t("rsvp_failed_convert_rsvp_time_utc") ||
						"Failed to convert reservation time",
				});
				return;
			}

			const arriveTimeEpoch = toBigIntEpochUnknown(rsvp.arriveTime);
			const arriveTimeDate = epochToDate(arriveTimeEpoch);

			const result = await updateRsvpAction(String(storeIdForEdit), {
				id: rsvp.id,
				customerId: rsvp.customerId ?? null,
				facilityId: rsvp.facilityId ?? null,
				serviceStaffId: rsvp.serviceStaffId ?? null,
				numOfAdult: rsvp.numOfAdult ?? 1,
				numOfChild: rsvp.numOfChild ?? 0,
				rsvpTime: rsvpTimeDate,
				arriveTime: arriveTimeDate ?? null,
				status: RsvpStatus.Ready,
				message: rsvp.message ?? null,
				alreadyPaid: Boolean(rsvp.alreadyPaid),
				confirmedByStore: true,
				confirmedByCustomer: Boolean(rsvp.confirmedByCustomer),
				facilityCost:
					rsvp.facilityCost !== null && rsvp.facilityCost !== undefined
						? Number(rsvp.facilityCost)
						: null,
				pricingRuleId: rsvp.pricingRuleId ?? null,
			});

			if (result?.serverError) {
				toastError({
					title: t("error"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.rsvp) {
				const updated = result.data.rsvp;
				const normalized = {
					...updated,
					rsvpTime: toBigIntEpochUnknown(updated.rsvpTime) ?? BigInt(0),
					createdAt: toBigIntEpochUnknown(updated.createdAt) ?? BigInt(0),
					updatedAt: toBigIntEpochUnknown(updated.updatedAt) ?? BigInt(0),
				};
				onReservationUpdated?.(normalized);
				toastSuccess({
					description: t("rsvp_confirmed_by_store_success"),
				});
				return;
			}
		}

		if (isStoreMode && rsvpSettings && facilities) {
			// Store mode: use props directly
			setStoreData({
				rsvpSettings,
				storeSettings: storeSettings ?? null,
				facilities,
			});
			setReservationToEdit(rsvp);
			setEditDialogOpen(true);
			return;
		}

		// Account mode: fetch store data
		setIsLoadingStoreData(true);
		try {
			const result = await getStoreDataAction({ storeId: storeIdForEdit });
			if (result?.serverError) {
				toastError({
					title: t("error"),
					description: result.serverError,
				});
				return;
			}
			if (result?.data) {
				setStoreData({
					rsvpSettings: result.data.rsvpSettings,
					storeSettings: result.data.storeSettings,
					facilities: result.data.facilities as unknown as StoreFacility[],
				});
				setReservationToEdit(rsvp);
				setEditDialogOpen(true);
			}
		} catch (error) {
			toastError({
				title: t("error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsLoadingStoreData(false);
		}
	};

	const handleReservationUpdated = (updatedRsvp: Rsvp) => {
		setEditDialogOpen(false);
		setReservationToEdit(null);
		setStoreData(null);
		if (onReservationUpdated) {
			const normalized = {
				...updatedRsvp,
				rsvpTime: toBigIntEpochUnknown(updatedRsvp.rsvpTime) ?? BigInt(0),
				createdAt: toBigIntEpochUnknown(updatedRsvp.createdAt) ?? BigInt(0),
				updatedAt: toBigIntEpochUnknown(updatedRsvp.updatedAt) ?? BigInt(0),
			};
			onReservationUpdated(normalized);
		} else if (typeof window !== "undefined") {
			window.location.reload();
		}
	};

	const effectiveTimezone = storeTimezone || defaultTimezone;
	const calendarLocation = useMemo(
		() => formatStoreCalendarLocation(storeSettings ?? undefined),
		[storeSettings],
	);
	const columns = useMemo(
		() =>
			createCustomerRsvpColumns(t, {
				storeTimezone: effectiveTimezone,
				onStatusClick: handleCancelClickWithEvent,
				canCancelReservation,
				canEditReservation,
				onEditClick: handleEditClick,
				onCheckoutClick: showCheckout ? handleCheckoutClick : undefined,
				hideActions,
				showStoreAdminConfirmAction: storeAdminList,
				showCalendarExport: Boolean(
					showCalendarExport && isStoreMode && storeId,
				),
				calendarLocation,
			}),
		[
			t,
			effectiveTimezone,
			handleCancelClickWithEvent,
			canCancelReservation,
			canEditReservation,
			handleEditClick,
			showCheckout,
			handleCheckoutClick,
			hideActions,
			storeAdminList,
			showCalendarExport,
			isStoreMode,
			storeId,
			calendarLocation,
		],
	);

	if (isEmpty && !showHeading) return null;

	return (
		<div
			className="relative"
			aria-busy={isCancelling}
			aria-disabled={isCancelling}
		>
			{isCancelling && (
				<div
					className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					aria-label={t("cancelling")}
				>
					<div className="flex flex-col items-center gap-3">
						<span className="text-sm font-medium text-muted-foreground">
							{t("cancelling")}
						</span>
					</div>
				</div>
			)}
			{showHeading && (
				<>
					<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-0">
						<Heading
							title={t("rsvp_history") || "Reservation History"}
							badge={sortedReservations.length}
							description=""
						/>
					</div>
					<Separator />
				</>
			)}
			<div className="space-y-3 sm:space-y-4">
				{/* Period Selector */}
				<RsvpPeriodSelector
					storeTimezone={storeTimezone || defaultTimezone}
					storeId={storeId || "account"}
					onPeriodRangeChange={handlePeriodRangeChange}
					defaultPeriod="all"
					allowCustom={true}
					showReset={true}
					onReset={handleResetToDefaults}
				/>
				{showHeading && <Separator />}

				{isEmpty && showHeading && (
					<div className="text-center py-8 text-muted-foreground">
						<span className="text-2xl font-mono">{t("no_result")}</span>
					</div>
				)}

				{/* Mobile card view (shared for both store and account modes) */}
				{!isEmpty && (
					<div className="block sm:hidden space-y-3 px-0">
						{sortedReservations.map((rsvp) => {
							const numOfAdult = rsvp.numOfAdult || 0;
							const numOfChild = rsvp.numOfChild || 0;
							const status = rsvp.status;
							const alreadyPaid = rsvp.alreadyPaid || false;
							const facilityCost = rsvp.facilityCost
								? Number(rsvp.facilityCost)
								: 0;
							const serviceStaffCost = rsvp.serviceStaffCost
								? Number(rsvp.serviceStaffCost)
								: 0;
							const total = facilityCost + serviceStaffCost;
							const isPaid = alreadyPaid || total <= 0;
							const isCheckoutClickable =
								!isPaid && rsvp.orderId && total > 0 && showCheckout;
							const storeIdForEdit = storeId ?? rsvp.Store?.id;
							const rsvpTimezone =
								rsvp.Store?.defaultTimezone ??
								storeTimezone ??
								defaultTimezone ??
								"Asia/Taipei";
							const storeName = rsvp.Store?.name;
							const facilityId = rsvp.Facility?.id;
							const facilityName = rsvp.Facility?.facilityName;
							const serviceStaffName =
								rsvp.ServiceStaff?.User?.name ||
								rsvp.ServiceStaff?.User?.email ||
								null;

							const facilityParts: React.ReactNode[] = [];

							if (storeName) {
								facilityParts.push(
									storeIdForEdit ? (
										<Link
											key="store"
											href={`/s/${storeIdForEdit}/reservation`}
											className="hover:underline text-primary"
										>
											{storeName}
										</Link>
									) : (
										storeName
									),
								);
							}
							if (facilityName) {
								facilityParts.push(
									storeIdForEdit && facilityId ? (
										<Link
											key="facility"
											href={`/s/${storeIdForEdit}/reservation/${facilityId}`}
											className="hover:underline text-primary"
										>
											{facilityName}
										</Link>
									) : (
										facilityName
									),
								);
							}
							if (serviceStaffName) {
								facilityParts.push(
									`${t("service_staff") || "Service Staff"}: ${serviceStaffName}`,
								);
							}

							return (
								<div
									key={rsvp.id}
									className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 text-xs touch-manipulation"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-xl truncate">
												{facilityParts.length === 0 ? (
													"-"
												) : (
													<span>
														{facilityParts.reduce<React.ReactNode[]>(
															(acc, part, i) =>
																i === 0 ? [part] : [...acc, " - ", part],
															[],
														)}
													</span>
												)}
											</div>
											<span className="font-mono text-xs sm:text-sm">
												{formatRsvpTimeUtil(rsvp, datetimeFormat, rsvpTimezone)}
											</span>
										</div>
										<div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
											<span
												role={canEditReservation(rsvp) ? "button" : undefined}
												onClick={(e) => {
													e.stopPropagation();
													if (canEditReservation(rsvp) && storeIdForEdit) {
														router.push(
															`/s/${storeIdForEdit}/reservation?edit=${rsvp.id}`,
														);
													}
												}}
												title={
													canEditReservation(rsvp)
														? t("edit_reservation") || "Edit reservation"
														: undefined
												}
												className={cn(
													"inline-flex items-center justify-center min-h-10 min-w-[44px] px-2 py-2 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 rounded font-mono touch-manipulation",
													getRsvpStatusColorClasses(status, false),
													canEditReservation(rsvp) &&
														"cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity",
												)}
											>
												<span className="font-medium text-xs sm:text-sm">
													{t(`rsvp_status_${status}`)}
												</span>
											</span>
											{showCheckout && !isPaid && (
												<span
													role={isCheckoutClickable ? "button" : undefined}
													onClick={(e) => {
														if (isCheckoutClickable && rsvp.orderId) {
															e.stopPropagation();
															router.push(`/checkout/${rsvp.orderId}`);
														}
													}}
													title={
														isCheckoutClickable
															? t("navigate_to_payment_page") ||
																"Navigate to payment page"
															: undefined
													}
													className={cn(
														"block h-5 w-5 sm:h-3 sm:w-3 rounded-full touch-manipulation shrink-0",
														isPaid ? "bg-green-500" : "bg-red-500",
														isCheckoutClickable &&
															"cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity",
													)}
												/>
											)}
										</div>
									</div>
									<div className="flex items-center justify-between pt-2 border-t">
										<div className="space-y-0.5">
											<div className="text-muted-foreground text-xs sm:text-sm">
												{t("rsvp_num_of_guest") || "Guests"}
											</div>
											<div className="font-semibold text-sm sm:text-base">
												{t("rsvp_num_of_guest_val", {
													adult: numOfAdult,
													child: numOfChild,
												})}
											</div>
										</div>
										<div className="flex items-center justify-end gap-2.5">
											{!hideActions &&
												(canEditReservation(rsvp) ||
													(storeAdminList &&
														rsvp.status === RsvpStatus.ReadyToConfirm)) && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleEditClick(rsvp);
														}}
														title={
															storeAdminList &&
															rsvp.status === RsvpStatus.ReadyToConfirm
																? t("rsvp_confirm_this_rsvp") ||
																	"Confirm reservation"
																: t("edit_reservation") || "Edit reservation"
														}
														className={cn(
															"flex h-8 w-8 items-center justify-center rounded-full text-white cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity touch-manipulation",
															storeAdminList &&
																rsvp.status === RsvpStatus.ReadyToConfirm
																? "bg-green-600"
																: "bg-blue-500",
														)}
													>
														{storeAdminList &&
														rsvp.status === RsvpStatus.ReadyToConfirm ? (
															<IconCheck className="h-4 w-4 sm:h-4 sm:w-4" />
														) : (
															<IconPencil className="h-4 w-4 sm:h-4 sm:w-4" />
														)}
													</button>
												)}

											{!hideActions && canCancelReservation(rsvp) && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														handleCancelClick(rsvp);
													}}
													disabled={isCancelling}
													title={
														t("cancel_reservation") || "Cancel reservation"
													}
													className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity touch-manipulation disabled:pointer-events-none disabled:opacity-50"
												>
													<IconX className="h-4 w-4 sm:h-4 sm:w-4" />
												</button>
											)}
										</div>
									</div>
									{rsvp.message && (
										<div className="pt-2 border-t">
											<span className="font-medium text-muted-foreground text-xs sm:text-sm">
												{t("rsvp_message")}:
											</span>{" "}
											<span className="text-foreground line-clamp-2 text-xs sm:text-sm">
												{rsvp.message}
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Desktop: DataTable (shared for both store and account modes) */}
				{!isEmpty && columns.length > 0 && (
					<div className="hidden sm:block">
						<DataTable<Rsvp, unknown>
							columns={columns}
							data={sortedReservations}
							searchKey="message"
						/>
					</div>
				)}

				{/* Cancel/Delete Confirmation Dialog */}
				{isStoreMode && rsvpSettings ? (
					<RsvpCancelDeleteDialog
						open={cancelDialogOpen}
						onOpenChange={setCancelDialogOpen}
						reservation={reservationToCancel}
						onConfirm={handleCancelConfirm}
						isLoading={isCancelling}
						rsvpSettings={rsvpSettings}
						storeCurrency={storeCurrency}
						useCustomerCredit={useCustomerCredit}
						creditExchangeRate={creditExchangeRate}
						t={t}
					/>
				) : (
					<AlertDialog
						open={cancelDialogOpen}
						onOpenChange={setCancelDialogOpen}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{reservationToCancel?.status === RsvpStatus.Pending
										? t("rsvp_delete_reservation")
										: t("rsvp_cancel_reservation")}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{reservationToCancel?.status === RsvpStatus.Pending
										? t("rsvp_delete_reservation_confirmation")
										: t("rsvp_cancel_reservation_confirmation")}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isCancelling}>
									{t("cancel")}
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleCancelConfirm}
									disabled={isCancelling}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{isCancelling
										? reservationToCancel?.status === RsvpStatus.Pending
											? t("deleting")
											: t("cancelling")
										: reservationToCancel?.status === RsvpStatus.Pending
											? t("confirm_delete")
											: t("confirm_cancel")}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}

				{/* Edit Reservation Dialog */}
				{reservationToEdit && storeData && (
					<ReservationDialog
						storeId={storeId ?? reservationToEdit.Store?.id ?? ""}
						rsvpSettings={storeData.rsvpSettings}
						storeSettings={storeData.storeSettings}
						facilities={storeData.facilities}
						user={user ?? null}
						rsvp={reservationToEdit}
						existingReservations={sortedReservations}
						storeTimezone={
							storeTimezone ||
							reservationToEdit.Store?.defaultTimezone ||
							"Asia/Taipei"
						}
						storeCurrency={storeCurrency}
						open={editDialogOpen}
						onOpenChange={(open) => {
							setEditDialogOpen(open);
							if (!open) {
								setReservationToEdit(null);
								setStoreData(null);
							}
						}}
						onReservationUpdated={handleReservationUpdated}
						useCustomerCredit={useCustomerCredit}
						creditExchangeRate={creditExchangeRate}
						creditServiceExchangeRate={creditServiceExchangeRate}
					/>
				)}

				{/* Status Legend */}
				<RsvpStatusLegend
					t={t}
					selectedStatuses={showStatusFilter ? selectedStatuses : undefined}
					onStatusClick={showStatusFilter ? handleStatusClick : undefined}
					collapsible={true}
					defaultExpanded={true}
				/>
			</div>
		</div>
	);
};
