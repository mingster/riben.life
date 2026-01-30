"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { toastError, toastSuccess } from "@/components/toaster";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpStatus } from "@/types/enum";
import { useRouter } from "next/navigation";
import { ReservationDialog } from "../../components/reservation-dialog";
import { RsvpCancelDeleteDialog } from "../../components/rsvp-cancel-delete-dialog";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";

import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	canCancelReservation as canCancelReservationUtil,
	canEditReservation as canEditReservationUtil,
	formatCreatedAt as formatCreatedAtUtil,
	formatRsvpTime as formatRsvpTimeUtil,
	getFacilityName as getFacilityNameUtil,
	isUserReservation as isUserReservationUtil,
	removeReservationFromLocalStorage as removeReservationFromLocalStorageUtil,
} from "@/utils/rsvp-utils";
import { IconX } from "@tabler/icons-react";
import { ClipLoader } from "react-spinners";
import { createCustomerRsvpColumns } from "./customer-rsvp-columns";

interface CustomerReservationHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
	rsvpSettings?: RsvpSettings | null;
	storeId: string;
	user: User | null;
	storeCurrency?: string;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
	facilities?: StoreFacility[];
	storeSettings?: StoreSettings | null;
}

export const CustomerReservationHistoryClient: React.FC<
	CustomerReservationHistoryClientProps
> = ({
	serverData,
	storeTimezone,
	rsvpSettings,
	storeId,
	user,
	storeCurrency = "twd",
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
	facilities = [],
	storeSettings = null,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	// State for cancel/delete dialog
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [reservationToCancel, setReservationToCancel] = useState<Rsvp | null>(
		null,
	);
	const [isCancelling, setIsCancelling] = useState(false);

	// State for edit dialog
	const [editRsvp, setEditRsvp] = useState<Rsvp | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	// Load local storage reservations for anonymous users
	const [localStorageReservations, setLocalStorageReservations] = useState<
		Rsvp[]
	>([]);

	// Load local storage reservations on mount and when storeId changes
	useEffect(() => {
		if (!storeId) return;

		const storageKey = `rsvp-${storeId}`;
		try {
			const storedData = localStorage.getItem(storageKey);
			if (storedData) {
				const parsed: Rsvp[] = JSON.parse(storedData);
				if (Array.isArray(parsed) && parsed.length > 0) {
					setLocalStorageReservations(parsed);
				}
			}
		} catch (error) {
			// Silently handle errors loading from local storage
		}
	}, [storeId]);

	// Merge server data with local storage for anonymous users
	const [allData, setAllData] = useState<Rsvp[]>(() => {
		// Start with server data
		return [...serverData];
	});

	// Update allData when localStorageReservations or serverData change
	// Remove reservations from local storage if they are deleted on the server
	useEffect(() => {
		if (!user && localStorageReservations.length > 0) {
			const storageKey = `rsvp-${storeId}`;
			const serverIdsSet = new Set(serverData.map((r) => r.id));

			// Filter out reservations that don't exist on the server (deleted reservations)
			const validLocalReservations = localStorageReservations.filter(
				(localRsvp) => serverIdsSet.has(localRsvp.id),
			);

			// Update local storage to remove deleted reservations
			if (validLocalReservations.length !== localStorageReservations.length) {
				try {
					if (validLocalReservations.length > 0) {
						localStorage.setItem(
							storageKey,
							JSON.stringify(validLocalReservations),
						);
					} else {
						localStorage.removeItem(storageKey);
					}
					setLocalStorageReservations(validLocalReservations);
				} catch (error) {
					// Silently handle errors updating local storage
				}
			}

			// For reservations that exist on both server and local storage, preserve name/phone from local storage
			const serverReservationsWithLocalData = serverData
				.filter((serverRsvp) => {
					// Only include server reservations that exist in local storage
					return validLocalReservations.some((r) => r.id === serverRsvp.id);
				})
				.map((serverRsvp) => {
					const localRsvp = validLocalReservations.find(
						(r) => r.id === serverRsvp.id,
					);
					if (localRsvp && localRsvp.name && localRsvp.phone) {
						// Preserve name and phone from local storage for anonymous reservations
						return {
							...serverRsvp,
							name: localRsvp.name,
							phone: localRsvp.phone,
						};
					}
					return serverRsvp;
				});

			setAllData(serverReservationsWithLocalData);
		} else if (!user && localStorageReservations.length === 0) {
			// If local storage is empty, show empty list (no anonymous reservations)
			setAllData([]);
		} else {
			// If user is logged in, only show server reservations
			setAllData(serverData);
		}
	}, [localStorageReservations, serverData, user, storeId]);

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

	// Status filter: default to Ready and ReadyToConfirm; remember user's selection in localStorage
	const STATUS_FILTER_STORAGE_KEY = `rsvp-history-status-${storeId}`;
	const VALID_RSVP_STATUSES: RsvpStatus[] = [
		RsvpStatus.Pending,
		RsvpStatus.ReadyToConfirm,
		RsvpStatus.Ready,
		RsvpStatus.Completed,
		RsvpStatus.Cancelled,
		RsvpStatus.NoShow,
	];
	const DEFAULT_STATUSES: RsvpStatus[] = [
		RsvpStatus.Ready,
		RsvpStatus.ReadyToConfirm,
	];

	const [selectedStatuses, setSelectedStatuses] = useState<RsvpStatus[]>(() => {
		if (typeof window === "undefined") return DEFAULT_STATUSES;
		try {
			const stored = localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as number[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					const valid = parsed.filter((n) =>
						VALID_RSVP_STATUSES.includes(n as RsvpStatus),
					) as RsvpStatus[];
					if (valid.length > 0) return valid;
				}
			}
		} catch {
			// ignore
		}
		return DEFAULT_STATUSES;
	});

	// Persist status filter when user toggles
	useEffect(() => {
		try {
			localStorage.setItem(
				STATUS_FILTER_STORAGE_KEY,
				JSON.stringify(selectedStatuses),
			);
		} catch {
			// ignore
		}
	}, [selectedStatuses, STATUS_FILTER_STORAGE_KEY]);

	// Restore status filter from localStorage when storeId changes (e.g. different store)
	useEffect(() => {
		const key = `rsvp-history-status-${storeId}`;
		try {
			const stored = localStorage.getItem(key);
			if (stored) {
				const parsed = JSON.parse(stored) as number[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					const valid = parsed.filter((n) =>
						VALID_RSVP_STATUSES.includes(n as RsvpStatus),
					) as RsvpStatus[];
					if (valid.length > 0) {
						setSelectedStatuses(valid);
						return;
					}
				}
			}
		} catch {
			// ignore
		}
		setSelectedStatuses(DEFAULT_STATUSES);
	}, [storeId]);

	const handleStatusClick = useCallback((status: RsvpStatus) => {
		setSelectedStatuses((prev) => {
			if (prev.includes(status)) {
				return prev.filter((s) => s !== status);
			}
			return [...prev, status];
		});
	}, []);

	// Filter data based on period range and selected statuses
	const data = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		let filtered = allData;

		// Filter by date range
		if (periodType !== "all" && startEpoch && endEpoch) {
			filtered = filtered.filter((rsvp) => {
				const rsvpTime = rsvp.rsvpTime;
				if (!rsvpTime) return false;
				const rsvpTimeBigInt =
					typeof rsvpTime === "bigint" ? rsvpTime : BigInt(rsvpTime);
				return rsvpTimeBigInt >= startEpoch && rsvpTimeBigInt <= endEpoch;
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

	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Helper to format RSVP time
	const formatRsvpTime = useCallback(
		(rsvp: Rsvp): string => {
			return formatRsvpTimeUtil(
				rsvp,
				datetimeFormat,
				storeTimezone ?? "Asia/Taipei",
			);
		},
		[storeTimezone, datetimeFormat],
	);

	// Helper to format created at
	const formatCreatedAt = useCallback(
		(rsvp: Rsvp): string => {
			return formatCreatedAtUtil(
				rsvp,
				datetimeFormat,
				storeTimezone ?? "Asia/Taipei",
			);
		},
		[storeTimezone, datetimeFormat],
	);

	// Helper to get facility name
	const getFacilityName = useCallback((rsvp: Rsvp): string => {
		return getFacilityNameUtil(rsvp);
	}, []);

	// Check if reservation belongs to current user
	const isUserReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			return isUserReservationUtil(rsvp, user, localStorageReservations);
		},
		[user, localStorageReservations],
	);

	// Check if reservation can be edited based on rsvpSettings
	const canEditReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			return canEditReservationUtil(rsvp, rsvpSettings, isUserReservation);
		},
		[rsvpSettings, isUserReservation],
	);

	// Check if reservation can be cancelled/deleted
	const canCancelReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			return canCancelReservationUtil(rsvp, rsvpSettings, isUserReservation);
		},
		[rsvpSettings, isUserReservation],
	);

	// Remove reservation from local storage (only for anonymous users)
	const removeReservationFromLocalStorage = useCallback(
		(reservationId: string) => {
			// Only remove from local storage for anonymous users
			// Signed-in users should keep reservations in local storage
			if (!user && storeId) {
				removeReservationFromLocalStorageUtil(
					storeId,
					reservationId,
					(updated) => {
						setLocalStorageReservations(updated);
					},
				);
			}
		},
		[user, storeId],
	);

	// Handle reservation updated (for cancelled reservations)
	const handleReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			setAllData((prev) => {
				const normalizedRsvp = {
					...updatedRsvp,
					rsvpTime:
						typeof updatedRsvp.rsvpTime === "number"
							? BigInt(updatedRsvp.rsvpTime)
							: updatedRsvp.rsvpTime instanceof Date
								? BigInt(updatedRsvp.rsvpTime.getTime())
								: updatedRsvp.rsvpTime,
					createdAt:
						typeof updatedRsvp.createdAt === "number"
							? BigInt(updatedRsvp.createdAt)
							: updatedRsvp.createdAt instanceof Date
								? BigInt(updatedRsvp.createdAt.getTime())
								: updatedRsvp.createdAt,
					updatedAt:
						typeof updatedRsvp.updatedAt === "number"
							? BigInt(updatedRsvp.updatedAt)
							: updatedRsvp.updatedAt instanceof Date
								? BigInt(updatedRsvp.updatedAt.getTime())
								: updatedRsvp.updatedAt,
				};

				const existingIndex = prev.findIndex((r) => r.id === normalizedRsvp.id);
				if (existingIndex === -1) {
					return [...prev, normalizedRsvp];
				}
				return prev.map((item) =>
					item.id === normalizedRsvp.id ? normalizedRsvp : item,
				);
			});

			// If user is anonymous, also update local storage
			if (!user && storeId) {
				const storageKey = `rsvp-${storeId}`;
				try {
					const storedData = localStorage.getItem(storageKey);
					if (storedData) {
						const localReservations: Rsvp[] = JSON.parse(storedData);
						const updatedLocal = localReservations.map((r) =>
							r.id === updatedRsvp.id
								? {
										...updatedRsvp,
										rsvpTime:
											typeof updatedRsvp.rsvpTime === "number"
												? updatedRsvp.rsvpTime
												: updatedRsvp.rsvpTime instanceof Date
													? updatedRsvp.rsvpTime.getTime()
													: typeof updatedRsvp.rsvpTime === "bigint"
														? Number(updatedRsvp.rsvpTime)
														: null,
										createdAt:
											typeof updatedRsvp.createdAt === "number"
												? updatedRsvp.createdAt
												: typeof updatedRsvp.createdAt === "bigint"
													? Number(updatedRsvp.createdAt)
													: null,
										updatedAt:
											typeof updatedRsvp.updatedAt === "number"
												? updatedRsvp.updatedAt
												: typeof updatedRsvp.updatedAt === "bigint"
													? Number(updatedRsvp.updatedAt)
													: null,
									}
								: r,
						);
						localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
						setLocalStorageReservations(updatedLocal);
					}
				} catch (error) {
					// Silently handle errors updating local storage
				}
			}
		},
		[user, storeId],
	);

	// Handle cancel click
	const handleCancelClick = useCallback((e: React.MouseEvent, rsvp: Rsvp) => {
		e.stopPropagation();
		setReservationToCancel(rsvp);
		setCancelDialogOpen(true);
	}, []);

	// Handle cancel/delete confirm
	const handleCancelConfirm = useCallback(async () => {
		if (!reservationToCancel) return;

		setIsCancelling(true);
		try {
			// If status is Pending, delete it (hard delete)
			// Otherwise, cancel it (change status to Cancelled)
			if (
				reservationToCancel.status === RsvpStatus.Pending ||
				reservationToCancel.status === RsvpStatus.ReadyToConfirm
			) {
				const result = await deleteReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_deleted"),
					});
					// Remove from local state
					setAllData((prev) =>
						prev.filter((r) => r.id !== reservationToCancel.id),
					);

					// Remove from local storage for anonymous users
					removeReservationFromLocalStorage(reservationToCancel.id);
				}
			} else {
				if (!storeId) {
					toastError({
						title: t("Error"),
						description: "Store ID is required",
					});
					return;
				}

				const result = await cancelReservationAction({
					id: reservationToCancel.id,
					storeId: storeId,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_cancelled"),
					});
					// Update local state with cancelled reservation
					if (result?.data?.rsvp) {
						handleReservationUpdated(result.data.rsvp);
					} else {
						// If no data returned, remove from list
						setAllData((prev) =>
							prev.filter((r) => r.id !== reservationToCancel.id),
						);

						// Remove from local storage for anonymous users
						removeReservationFromLocalStorage(reservationToCancel.id);
					}
				}
			}
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsCancelling(false);
			setCancelDialogOpen(false);
			setReservationToCancel(null);
		}
	}, [
		reservationToCancel,
		storeId,
		t,
		handleReservationUpdated,
		removeReservationFromLocalStorage,
	]);

	const handleEditClick = useCallback((rsvp: Rsvp) => {
		// Open edit dialog instead of redirecting to week view page
		setEditRsvp(rsvp);
		setEditDialogOpen(true);
	}, []);

	const handleEditDialogClose = useCallback(() => {
		// Close edit dialog and stay on history page
		setEditDialogOpen(false);
		setEditRsvp(null);
	}, []);

	const handleEditReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			// Close edit dialog after update
			setEditDialogOpen(false);
			setEditRsvp(null);
			// Update local state with the updated reservation (using existing handleReservationUpdated)
			setAllData((prev) => {
				const normalizedRsvp = {
					...updatedRsvp,
					rsvpTime:
						typeof updatedRsvp.rsvpTime === "number"
							? BigInt(updatedRsvp.rsvpTime)
							: updatedRsvp.rsvpTime instanceof Date
								? BigInt(updatedRsvp.rsvpTime.getTime())
								: updatedRsvp.rsvpTime,
					createdAt:
						typeof updatedRsvp.createdAt === "number"
							? BigInt(updatedRsvp.createdAt)
							: updatedRsvp.createdAt instanceof Date
								? BigInt(updatedRsvp.createdAt.getTime())
								: updatedRsvp.createdAt,
					updatedAt:
						typeof updatedRsvp.updatedAt === "number"
							? BigInt(updatedRsvp.updatedAt)
							: updatedRsvp.updatedAt instanceof Date
								? BigInt(updatedRsvp.updatedAt.getTime())
								: updatedRsvp.updatedAt,
				};

				const existingIndex = prev.findIndex((r) => r.id === normalizedRsvp.id);
				if (existingIndex === -1) {
					return [...prev, normalizedRsvp];
				}
				return prev.map((item) =>
					item.id === normalizedRsvp.id ? normalizedRsvp : item,
				);
			});

			// If user is anonymous, also update local storage
			if (!user && storeId) {
				const storageKey = `rsvp-${storeId}`;
				try {
					const storedData = localStorage.getItem(storageKey);
					if (storedData) {
						const localReservations: Rsvp[] = JSON.parse(storedData);
						const updatedLocal = localReservations.map((r) =>
							r.id === updatedRsvp.id
								? {
										...updatedRsvp,
										rsvpTime:
											typeof updatedRsvp.rsvpTime === "number"
												? updatedRsvp.rsvpTime
												: updatedRsvp.rsvpTime instanceof Date
													? updatedRsvp.rsvpTime.getTime()
													: typeof updatedRsvp.rsvpTime === "bigint"
														? Number(updatedRsvp.rsvpTime)
														: null,
										createdAt:
											typeof updatedRsvp.createdAt === "number"
												? updatedRsvp.createdAt
												: typeof updatedRsvp.createdAt === "bigint"
													? Number(updatedRsvp.createdAt)
													: null,
										updatedAt:
											typeof updatedRsvp.updatedAt === "number"
												? updatedRsvp.updatedAt
												: typeof updatedRsvp.updatedAt === "bigint"
													? Number(updatedRsvp.updatedAt)
													: null,
									}
								: r,
						);
						localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
						setLocalStorageReservations(updatedLocal);
					}
				} catch (error) {
					// Silently handle errors updating local storage
				}
			}
		},
		[user, storeId],
	);

	const handleCheckoutClick = useCallback(
		(orderId: string) => {
			router.push(`/checkout/${orderId}`);
		},
		[router],
	);

	const columns = useMemo(
		() =>
			createCustomerRsvpColumns(t, {
				storeTimezone,
				onStatusClick: handleCancelClick,
				canCancelReservation,
				canEditReservation,
				onEditClick: handleEditClick,
				onCheckoutClick: handleCheckoutClick,
			}),
		[
			t,
			storeTimezone,
			handleCancelClick,
			canCancelReservation,
			canEditReservation,
			handleEditClick,
			handleCheckoutClick,
		],
	);
	/*
	if (!data || data.length === 0) {
		return (
			<>
				<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Heading
						title={t("rsvp_history") || "Reservation History"}
						badge={0}
						description=""
					/>
				</div>
				<Separator />
				<div className="text-center py-8 text-muted-foreground">
					<span className="text-2xl font-mono">{t("no_result")}</span>
				</div>
			</>
		);
	}
*/
	const isTransactionInProgress = isCancelling;
	const overlayStatusText = t("cancelling");

	return (
		<div
			className="relative"
			aria-busy={isTransactionInProgress}
			aria-disabled={isTransactionInProgress}
		>
			{/* Overlay loader: lock UI during cancel, edit, and other transactional activities (form handling standard) */}
			{isTransactionInProgress && (
				<div
					className="absolute inset-0 z-[100] flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					aria-label={overlayStatusText}
				>
					<div className="flex flex-col items-center gap-3">
						<ClipLoader size={40} color="#3498db" />
						<span className="text-sm font-medium text-muted-foreground">
							{overlayStatusText}
						</span>
					</div>
				</div>
			)}
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-0">
				<Heading
					title={t("rsvp_history") || "Reservation History"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<div className="flex flex-col gap-3 sm:gap-4 py-2 sm:py-3">
				<RsvpPeriodSelector
					storeTimezone={storeTimezone}
					storeId={storeId}
					onPeriodRangeChange={handlePeriodRangeChange}
					defaultPeriod="month"
					allowCustom={true}
				/>
			</div>
			<Separator />

			{/* Mobile: Card view — touch-friendly targets (min 44px) */}
			<div className="block sm:hidden space-y-3 px-0">
				{data.map((rsvp) => {
					const numOfAdult = rsvp.numOfAdult || 0;
					const numOfChild = rsvp.numOfChild || 0;
					const status = rsvp.status;
					const alreadyPaid = rsvp.alreadyPaid || false;

					// Calculate total cost
					const facilityCost = rsvp.facilityCost
						? Number(rsvp.facilityCost)
						: 0;
					const serviceStaffCost = rsvp.serviceStaffCost
						? Number(rsvp.serviceStaffCost)
						: 0;
					const total = facilityCost + serviceStaffCost;

					// Show green if already paid OR if total <= 0 (nothing to pay)
					const isPaid = alreadyPaid || total <= 0;

					// Check if clickable (not paid, has orderId, and total > 0)
					const isCheckoutClickable = !isPaid && rsvp.orderId && total > 0;

					return (
						<div
							key={rsvp.id}
							className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 text-xs touch-manipulation"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<div className="font-medium text-sm sm:text-base truncate">
										{getFacilityName(rsvp)}
									</div>
									<span className="font-mono text-xs sm:text-sm">
										{formatRsvpTime(rsvp)}
									</span>
								</div>
								<div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
									{/* Status badge — min 44px touch target on mobile */}
									<span
										role={canEditReservation(rsvp) ? "button" : undefined}
										onClick={(e) => {
											e.stopPropagation();
											if (canEditReservation(rsvp)) {
												router.push(
													`/s/${storeId}/reservation?edit=${rsvp.id}`,
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
									{/* Checkout indicator — 44px tap area on mobile */}
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
											"block h-6 w-6 sm:h-3 sm:w-3 rounded-full touch-manipulation shrink-0",
											isPaid ? "bg-green-500" : "bg-red-500",
											isCheckoutClickable &&
												"cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity",
										)}
									/>
									{canCancelReservation(rsvp) && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleCancelClick(e, rsvp);
											}}
											disabled={isTransactionInProgress}
											title={t("cancel_reservation") || "Cancel reservation"}
											className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-red-500 text-white cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity touch-manipulation disabled:pointer-events-none disabled:opacity-50"
										>
											<IconX className="h-5 w-5 sm:h-4 sm:w-4" />
										</button>
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

								<div className="space-y-0.5 text-right">
									<div className="text-muted-foreground text-xs sm:text-sm">
										{t("created_at")}
									</div>
									<span className="font-mono text-xs sm:text-sm">
										{formatCreatedAt(rsvp)}
									</span>
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

			{/* Desktop: Table view */}
			<div className="hidden sm:block">
				<DataTable<Rsvp, unknown>
					columns={columns}
					data={data}
					searchKey="message"
				/>
			</div>

			<div className="mt-3 sm:mt-4">
				<RsvpStatusLegend
					t={t}
					selectedStatuses={selectedStatuses}
					onStatusClick={handleStatusClick}
				/>
			</div>

			{/* Cancel/Delete Confirmation Dialog */}
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

			{/* Edit Reservation Dialog */}
			{editRsvp && (
				<ReservationDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					facilities={facilities}
					user={user}
					rsvp={editRsvp}
					existingReservations={data}
					storeTimezone={storeTimezone}
					storeCurrency={storeCurrency}
					open={editDialogOpen}
					onOpenChange={handleEditDialogClose}
					onReservationUpdated={handleEditReservationUpdated}
					useCustomerCredit={useCustomerCredit}
					creditExchangeRate={creditExchangeRate}
					creditServiceExchangeRate={creditServiceExchangeRate}
				/>
			)}
		</div>
	);
};
