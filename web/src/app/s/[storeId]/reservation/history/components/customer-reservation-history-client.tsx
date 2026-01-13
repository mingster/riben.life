"use client";

import {
	addDays,
	endOfMonth,
	endOfWeek,
	endOfYear,
	startOfMonth,
	startOfWeek,
	startOfYear,
	subDays,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { RsvpStatus } from "@/types/enum";
import { useRouter } from "next/navigation";
import { ReservationDialog } from "../../components/reservation-dialog";
import { RsvpCancelDeleteDialog } from "../../components/rsvp-cancel-delete-dialog";

import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import {
	convertToUtc,
	dateToEpoch,
	formatUtcDateToDateTimeLocal,
} from "@/utils/datetime-utils";
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

type PeriodType = "week" | "month" | "year" | "custom";

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

	return (
		<>
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("rsvp_history") || "Reservation History"}
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
						className="h-10 sm:h-9 touch-manipulation text-sm sm:text-xs"
					>
						{t("this_week") || "This Week"}
					</Button>
					<Button
						variant={periodType === "month" ? "default" : "outline"}
						size="sm"
						onClick={() => handlePeriodChange("month")}
						className="h-10 sm:h-9 touch-manipulation text-sm sm:text-xs"
					>
						{t("this_month") || "This Month"}
					</Button>
					<Button
						variant={periodType === "year" ? "default" : "outline"}
						size="sm"
						onClick={() => handlePeriodChange("year")}
						className="h-10 sm:h-9 touch-manipulation text-sm sm:text-xs"
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
								className="h-10 text-base sm:text-sm sm:h-9 w-full sm:w-auto touch-manipulation"
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
								className="h-10 text-base sm:text-sm sm:h-9 w-full sm:w-auto touch-manipulation"
							/>
						</div>
					</div>
				</div>
			</div>
			<Separator />

			{/* Mobile: Card view */}
			<div className="block sm:hidden space-y-3">
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
							className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 text-xs"
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
								<div className="shrink-0 flex items-center gap-1.5">
									<span
										onClick={(e) => {
											e.stopPropagation();
											if (canEditReservation(rsvp)) {
												// Navigate to edit page
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
											"inline-flex items-center px-2 py-1 rounded font-mono",
											getRsvpStatusColorClasses(status, false),
											canEditReservation(rsvp) &&
												"cursor-pointer hover:opacity-80 transition-opacity",
										)}
									>
										<span className="font-medium">
											{t(`rsvp_status_${status}`)}
										</span>
									</span>
									<span
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
											"h-2 w-2 rounded-full",
											isPaid ? "bg-green-500" : "bg-red-500",
											isCheckoutClickable &&
												"cursor-pointer hover:opacity-80 transition-opacity",
										)}
									/>
									{canCancelReservation(rsvp) && (
										<IconX
											className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity bg-red-500"
											onClick={(e) => {
												e.stopPropagation();
												handleCancelClick(e, rsvp);
											}}
											title={t("cancel_reservation") || "Cancel reservation"}
										/>
									)}
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t">
								<div className="space-y-1">
									<div className="text-muted-foreground">
										{t("rsvp_num_of_guest") || "Guests"}
									</div>
									<div className="font-semibold text-base">
										{t("rsvp_num_of_guest_val", {
											adult: numOfAdult,
											child: numOfChild,
										})}
									</div>
								</div>

								<div className="space-y-1 text-right">
									<div className="text-muted-foreground">{t("created_at")}</div>
									<span className="font-mono text-xs sm:text-sm">
										{formatCreatedAt(rsvp)}
									</span>
								</div>
							</div>

							{rsvp.message && (
								<div className="pt-2 border-t">
									<span className="font-medium text-muted-foreground">
										{t("rsvp_message")}:
									</span>{" "}
									<span className="text-foreground line-clamp-2">
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

			<div className="mt-4">
				<RsvpStatusLegend t={t} />
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
		</>
	);
};
