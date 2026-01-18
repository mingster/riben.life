"use client";

import {
	IconChevronLeft,
	IconChevronRight,
	IconTrash,
} from "@tabler/icons-react";
import {
	format,
	addDays,
	subDays,
	isSameDay,
	parseISO,
	Locale,
	isBefore,
	startOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { RsvpStatus } from "@/types/enum";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	isUserReservation as isUserReservationUtil,
	canEditReservation as canEditReservationUtil,
	canCancelReservation as canCancelReservationUtil,
	removeReservationFromLocalStorage as removeReservationFromLocalStorageUtil,
	generateTimeSlots,
	getReservationDisplayName,
	groupRsvpsByDayAndTime,
	transformReservationForStorage,
	checkTimeAgainstBusinessHours,
} from "@/utils/rsvp-utils";
import { ReservationDialog } from "./reservation-dialog";
import { RsvpCancelDeleteDialog } from "./rsvp-cancel-delete-dialog";
import {
	getDateInTz,
	getUtcNow,
	getOffsetHours,
	epochToDate,
	dayAndTimeSlotToUtc,
	dateToEpoch,
	convertToUtc,
} from "@/utils/datetime-utils";
import type { Rsvp as RsvpType } from "@/types";
import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { updateReservationAction } from "@/actions/store/reservation/update-reservation";
import { toastError, toastSuccess } from "@/components/toaster";
import {
	DndContext,
	type DragEndEvent,
	type DragStartEvent,
	useDraggable,
	useDroppable,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useIsHydrated } from "@/hooks/use-hydrated";
import logger from "@/lib/logger";
import { AlertModal } from "@/components/modals/alert-modal";

interface CustomerWeekViewCalendarProps {
	existingReservations: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	onTimeSlotClick?: (day: Date, timeSlot: string) => void;
	// Props for dialog
	storeId?: string;
	storeOwnerId?: string;
	facilities?: StoreFacility[];
	user?: User | null;
	storeTimezone?: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	isBlacklisted?: boolean;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
}

// Get day name abbreviation using i18n
const getDayName = (date: Date, t: (key: string) => string): string => {
	const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const dayNames: Record<number, string> = {
		0: "weekday_Sunday",
		1: "weekday_Monday",
		2: "weekday_Tuesday",
		3: "weekday_Wednesday",
		4: "weekday_Thursday",
		5: "weekday_Friday",
		6: "weekday_Saturday",
	};
	return t(dayNames[dayOfWeek] || "weekday_Sunday");
};

// Get day number
const getDayNumber = (date: Date): string => {
	return format(date, "d");
};

// Check if a date is today (in store timezone)
const isToday = (date: Date, storeTimezone: string): boolean => {
	const todayInStoreTz = getDateInTz(
		getUtcNow(),
		getOffsetHours(storeTimezone),
	);
	return isSameDay(date, todayInStoreTz);
};

// Draggable Card Component
interface DraggableCardProps {
	id: string;
	children: React.ReactNode;
	className?: string;
	isDragging?: boolean;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
	id,
	children,
	className,
	isDragging = false,
}) => {
	const isHydrated = useIsHydrated();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		isDragging: isDraggingState,
	} = useDraggable({
		id,
	});

	// Apply drag styles only after hydration to prevent mismatch
	const style =
		isHydrated && transform
			? {
					transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
					opacity: isDraggingState ? 0.5 : 1,
				}
			: {
					// Default style for SSR and initial client render
					opacity: 1,
				};

	return (
		<div ref={setNodeRef} style={style} {...listeners} {...attributes}>
			{children}
		</div>
	);
};

// Droppable Slot Component
interface DroppableSlotProps {
	id: string;
	children: React.ReactNode;
	className?: string;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({
	id,
	children,
	className,
}) => {
	const { isOver, setNodeRef } = useDroppable({
		id,
	});

	return (
		<div
			ref={setNodeRef}
			className={cn(
				className,
				isOver && "bg-primary/20 ring-2 ring-primary ring-offset-2",
			)}
		>
			{children}
		</div>
	);
};

export const CustomerWeekViewCalendar: React.FC<
	CustomerWeekViewCalendarProps
> = ({
	existingReservations,
	rsvpSettings,
	storeSettings,
	onTimeSlotClick,
	storeId,
	storeOwnerId,
	facilities = [],
	user,
	storeTimezone = "Asia/Taipei",
	storeCurrency = "twd",
	storeUseBusinessHours,
	onReservationCreated,
	isBlacklisted = false,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Convert UTC today to store timezone for display
	const todayUtc = useMemo(() => getUtcNow(), []);
	const today = useMemo(
		() => startOfDay(getDateInTz(todayUtc, getOffsetHours(storeTimezone))),
		[todayUtc, storeTimezone],
	);
	// Load local storage reservations for anonymous users
	const [localStorageReservations, setLocalStorageReservations] = useState<
		Rsvp[]
	>([]);
	// Track deleted reservation IDs to prevent them from being re-added from server
	const [deletedReservationIds, setDeletedReservationIds] = useState<
		Set<string>
	>(new Set());
	// Track updated reservations to use in merge logic instead of stale server data
	const [updatedReservations, setUpdatedReservations] = useState<
		Map<string, Rsvp>
	>(new Map());

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

	// Merge server reservations with local storage reservations
	const [rsvps, setRsvps] = useState<Rsvp[]>(() => {
		return [...existingReservations];
	});

	// Update rsvps when localStorageReservations or existingReservations change
	// Preserve local storage as backup even after user signs in/out
	useEffect(() => {
		// Apply updated reservations to server data
		const applyUpdatedReservations = (reservations: Rsvp[]): Rsvp[] => {
			return reservations.map((r) => updatedReservations.get(r.id) || r);
		};

		// Filter out deleted reservations and apply updates
		const filteredServerReservations = existingReservations
			.filter((r) => !deletedReservationIds.has(r.id))
			.map((r) => updatedReservations.get(r.id) || r);

		// For anonymous users with local storage, merge with server data
		if (!user && localStorageReservations.length > 0) {
			const serverIdsSet = new Set(filteredServerReservations.map((r) => r.id));
			const localOnlyReservations = localStorageReservations.filter(
				(localRsvp) => !serverIdsSet.has(localRsvp.id),
			);

			// Preserve name/phone from local storage for reservations that exist on server
			const serverReservationsWithLocalData = filteredServerReservations.map(
				(serverRsvp) => {
					const localRsvp = localStorageReservations.find(
						(r) => r.id === serverRsvp.id,
					);
					if (localRsvp?.name && localRsvp?.phone) {
						return {
							...serverRsvp,
							name: localRsvp.name,
							phone: localRsvp.phone,
						};
					}
					return serverRsvp;
				},
			);

			setRsvps([...serverReservationsWithLocalData, ...localOnlyReservations]);
		} else {
			// For logged-in users or anonymous users without local storage
			setRsvps(filteredServerReservations);
		}
	}, [
		localStorageReservations,
		existingReservations,
		user,
		deletedReservationIds,
		updatedReservations,
	]);

	const [currentDay, setCurrentDay] = useState(() => {
		// Always start with today as the first day
		// Use UTC for consistency, then convert to store timezone for display
		return getUtcNow();
	});
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [reservationToCancel, setReservationToCancel] = useState<Rsvp | null>(
		null,
	);
	const [isCancelling, setIsCancelling] = useState(false);
	const [openEditDialogId, setOpenEditDialogId] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [moveIntoCancelWindowConfirmOpen, setMoveIntoCancelWindowConfirmOpen] =
		useState(false);
	const [pendingUpdate, setPendingUpdate] = useState<{
		rsvp: Rsvp;
		newRsvpTime: Date;
	} | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	// Configure drag sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // 8px before drag starts
			},
		}),
	);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60; // Default to 60 minutes
	const acceptReservation = rsvpSettings?.acceptReservation ?? true; // Default to true
	const canCreateReservation = acceptReservation && !isBlacklisted;
	const singleServiceMode = rsvpSettings?.singleServiceMode ?? false;

	// Helper function to check if a facility is available at a given time
	const isFacilityAvailableAtTime = useCallback(
		(
			facility: StoreFacility,
			checkTime: Date | null | undefined,
			timezone: string,
		): boolean => {
			// If no time selected, show all facilities
			if (!checkTime || isNaN(checkTime.getTime())) {
				return true;
			}

			// If facility has no business hours, assume it's always available
			if (!facility.businessHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				facility.businessHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[],
	);

	// Helper function to check if any facilities are available for a time slot
	// Returns true if facilities are available OR if no facilities exist (allows reservations without facilities)
	const hasAvailableFacilities = useCallback(
		(slotTime: Date, existingReservations: Rsvp[]): boolean => {
			// If no facilities exist at all, allow reservations without facilities
			if (!facilities || facilities.length === 0) {
				return true;
			}

			// First filter by business hours availability
			let available = facilities.filter((facility: StoreFacility) =>
				isFacilityAvailableAtTime(facility, slotTime, storeTimezone),
			);

			if (available.length === 0) {
				return false;
			}

			// Convert slotTime to epoch for comparison
			const slotTimeEpoch = dateToEpoch(slotTime);
			if (!slotTimeEpoch) {
				return available.length > 0;
			}

			// Calculate slot duration in milliseconds
			const durationMs = defaultDuration * 60 * 1000;
			const slotStart = Number(slotTimeEpoch);
			const slotEnd = slotStart + durationMs;

			// Find existing reservations that overlap with this time slot
			const conflictingReservations = existingReservations.filter(
				(existingRsvp) => {
					// Exclude cancelled reservations
					if (existingRsvp.status === RsvpStatus.Cancelled) {
						return false;
					}

					// Convert existing reservation time to epoch
					let existingRsvpTime: bigint;
					if (existingRsvp.rsvpTime instanceof Date) {
						existingRsvpTime = BigInt(existingRsvp.rsvpTime.getTime());
					} else if (typeof existingRsvp.rsvpTime === "number") {
						existingRsvpTime = BigInt(existingRsvp.rsvpTime);
					} else if (typeof existingRsvp.rsvpTime === "bigint") {
						existingRsvpTime = existingRsvp.rsvpTime;
					} else {
						return false;
					}

					const existingStart = Number(existingRsvpTime);
					// Get duration from facility or use default
					const existingDuration =
						existingRsvp.Facility?.defaultDuration ?? defaultDuration;
					const existingDurationMs = existingDuration * 60 * 1000;
					const existingEnd = existingStart + existingDurationMs;

					// Check if slots overlap (they overlap if one starts before the other ends)
					return slotStart < existingEnd && slotEnd > existingStart;
				},
			);

			if (singleServiceMode) {
				// Single Service Mode: If ANY reservation exists, no facilities available
				if (conflictingReservations.length > 0) {
					return false;
				}
			} else {
				// Default Mode: Filter out only facilities that have reservations
				const bookedFacilityIds = new Set(
					conflictingReservations
						.map((r) => r.facilityId)
						.filter((id): id is string => Boolean(id)),
				);

				available = available.filter(
					(facility) => !bookedFacilityIds.has(facility.id),
				);
			}

			return available.length > 0;
		},
		[
			facilities,
			isFacilityAvailableAtTime,
			storeTimezone,
			defaultDuration,
			singleServiceMode,
		],
	);

	// Time slots are generated at intervals matching defaultDuration
	// RSVPs are grouped into the correct slots based on defaultDuration
	const timeSlots = useMemo(
		() =>
			generateTimeSlots(
				useBusinessHours,
				rsvpHours,
				businessHours,
				defaultDuration,
			),
		[useBusinessHours, rsvpHours, businessHours, defaultDuration],
	);

	// Map i18n language codes to date-fns locales
	const calendarLocale = useMemo((): Locale => {
		const localeMap: Record<string, Locale> = {
			tw: zhTW,
			en: enUS,
			jp: ja,
		};
		return localeMap[lng || "tw"] || zhTW;
	}, [lng]);

	// Convert currentDay (which is in local time) to store timezone for day calculations
	const currentDayInStoreTz = useMemo(
		() => getDateInTz(currentDay, getOffsetHours(storeTimezone)),
		[currentDay, storeTimezone],
	);

	// Always start with today (or the selected day) as the first day
	const weekStart = useMemo(
		() => startOfDay(currentDayInStoreTz),
		[currentDayInStoreTz],
	);
	// Week end is 6 days after week start (7 days total starting from today)
	const weekEnd = useMemo(() => startOfDay(addDays(weekStart, 6)), [weekStart]);

	// Check if current day is before today
	const isDayInPast = useMemo(
		() => isBefore(startOfDay(currentDayInStoreTz), today),
		[currentDayInStoreTz, today],
	);

	// Generate days of the week
	const weekDays = useMemo(() => {
		const days: Date[] = [];
		// Extract date components from weekStart in store timezone
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: storeTimezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		const weekStartStr = formatter.format(weekStart);
		const [startYear, startMonth, startDay] = weekStartStr
			.split("-")
			.map(Number);

		// Create day objects at 00:00 in store timezone, then convert to UTC
		// This ensures each day represents the correct calendar day in store timezone
		for (let i = 0; i < 7; i++) {
			const dayOfMonth = startDay + i;
			// Create datetime-local string for the day at 00:00 in store timezone
			const datetimeLocalString = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}T00:00`;
			// Convert to UTC Date using convertToUtc
			const dayUtc = convertToUtc(datetimeLocalString, storeTimezone);
			days.push(dayUtc);
		}
		return days;
	}, [weekStart, storeTimezone]);

	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Group RSVPs by day and time (convert UTC to store timezone)
	const groupedRsvps = useMemo(
		() =>
			groupRsvpsByDayAndTime(
				rsvps,
				weekStart,
				weekEnd,
				storeTimezone,
				defaultDuration,
			),
		[rsvps, weekStart, weekEnd, storeTimezone, defaultDuration],
	);

	// Pre-compute which slots are in the past or too soon (based on canReserveBefore setting)
	const pastSlots = useMemo(() => {
		const past = new Set<string>();
		const now = getUtcNow();
		// Use rsvpSettings.canReserveBefore (default: 2 hours) to match server-side validation
		const minAdvanceHours = rsvpSettings?.canReserveBefore ?? 2;
		const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000; // Convert to milliseconds
		weekDays.forEach((day) => {
			timeSlots.forEach((timeSlot) => {
				const slotDateTimeUtc = dayAndTimeSlotToUtc(
					day,
					timeSlot,
					storeTimezone || "Asia/Taipei",
				);
				const timeUntilSlot = slotDateTimeUtc.getTime() - now.getTime();
				// Mark as past if slot is in the past OR less than minAdvanceHours from now
				if (timeUntilSlot < minAdvanceMs) {
					past.add(`${day.toISOString()}-${timeSlot}`);
				}
			});
		});
		return past;
	}, [weekDays, timeSlots, storeTimezone, rsvpSettings?.canReserveBefore]);

	// Pre-compute which days are today to avoid repeated date calculations
	const todayDays = useMemo(() => {
		const todaySet = new Set<string>();
		weekDays.forEach((day) => {
			if (isToday(day, storeTimezone)) {
				todaySet.add(day.toISOString());
			}
		});
		return todaySet;
	}, [weekDays, storeTimezone]);

	// Check if current user is the store owner
	const isStoreOwner = useMemo(
		() => Boolean(user?.id && storeOwnerId && user.id === storeOwnerId),
		[user?.id, storeOwnerId],
	);

	// Helper to check if a reservation belongs to the current user
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

	// Check if reservation can be cancelled/deleted based on rsvpSettings
	const canCancelReservation = useCallback(
		(rsvp: Rsvp): boolean => {
			return canCancelReservationUtil(rsvp, rsvpSettings, isUserReservation);
		},
		[rsvpSettings, isUserReservation],
	);

	const handlePreviousWeek = useCallback(() => {
		setCurrentDay((prev) => {
			const newDay = subDays(prev, 1);
			const newDayInStoreTz = getDateInTz(
				newDay,
				getOffsetHours(storeTimezone),
			);
			// Don't allow navigation to past days
			if (isBefore(startOfDay(newDayInStoreTz), today)) {
				return prev; // Stay on current day
			}
			return newDay;
		});
	}, [today, storeTimezone]);

	const handleNextWeek = useCallback(() => {
		setCurrentDay((prev) => addDays(prev, 1));
	}, []);

	const handleToday = useCallback(() => {
		setCurrentDay(getUtcNow());
	}, []);

	const getRsvpsForSlot = useCallback(
		(day: Date, timeSlot: string): Rsvp[] => {
			const dayKey = format(day, "yyyy-MM-dd");
			const key = `${dayKey}-${timeSlot}`;
			return groupedRsvps[key] || [];
		},
		[groupedRsvps],
	);

	const handleTimeSlotClick = useCallback(
		(day: Date, timeSlot: string) => {
			onTimeSlotClick?.(day, timeSlot);
		},
		[onTimeSlotClick],
	);

	const handleReservationCreated = useCallback(
		(newRsvp: Rsvp) => {
			if (!newRsvp) return;

			// For anonymous users, update local storage first so it's recognized as owned
			if (!user && storeId) {
				try {
					const storageKey = `rsvp-${storeId}`;
					const storedData = localStorage.getItem(storageKey);
					const existingReservations: Rsvp[] = storedData
						? JSON.parse(storedData)
						: [];

					// Check if reservation already exists in local storage
					const existsInStorage = existingReservations.some(
						(r) => r.id === newRsvp.id,
					);

					if (!existsInStorage) {
						// Transform reservation data for localStorage (convert BigInt/Date to number)
						const reservationForStorage = transformReservationForStorage(
							newRsvp,
						) as RsvpType;

						const updatedReservations = [
							...existingReservations,
							reservationForStorage,
						];

						// Update localStorage
						localStorage.setItem(
							storageKey,
							JSON.stringify(updatedReservations),
						);

						// Update local storage state - this will trigger the useEffect to merge properly
						setLocalStorageReservations(updatedReservations);

						// Also immediately update display state to show the new reservation
						// Use the transformed reservation format to match what's in local storage
						// The reservation won't be in existingReservations (server data) yet, so it's a local-only reservation
						setRsvps((prev) => {
							const exists = prev.some((item) => item.id === newRsvp.id);
							if (exists) return prev;
							// Add the new reservation to the display list using the transformed format
							// It will be properly merged when the useEffect runs
							return [reservationForStorage as Rsvp, ...prev];
						});
					}
				} catch (error) {
					// Silently handle errors updating local storage
				}
			} else {
				// For signed-in users, just update display reservations
				setRsvps((prev) => {
					const exists = prev.some((item) => item.id === newRsvp.id);
					if (exists) return prev;
					return [newRsvp, ...prev];
				});
			}

			onReservationCreated?.(newRsvp);
		},
		[onReservationCreated, user, storeId],
	);

	// Helper function to remove reservation from local storage
	const removeReservationFromLocalStorage = useCallback(
		(reservationId: string) => {
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

	const handleReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			if (!updatedRsvp) return;

			// Ensure rsvpTime is properly formatted as Date if it's a string
			const normalizedRsvp: Rsvp = {
				...updatedRsvp,
				rsvpTime:
					updatedRsvp.rsvpTime instanceof Date
						? updatedRsvp.rsvpTime
						: typeof updatedRsvp.rsvpTime === "string"
							? parseISO(updatedRsvp.rsvpTime)
							: typeof updatedRsvp.rsvpTime === "bigint"
								? epochToDate(updatedRsvp.rsvpTime)
								: typeof updatedRsvp.rsvpTime === "number"
									? epochToDate(BigInt(updatedRsvp.rsvpTime))
									: updatedRsvp.rsvpTime,
			};

			// Store updated reservation so merge logic uses it instead of stale server data
			setUpdatedReservations((prev) => {
				const updated = new Map(prev);
				updated.set(normalizedRsvp.id, normalizedRsvp);
				return updated;
			});

			// Update display state immediately
			setRsvps((prev) => {
				const index = prev.findIndex((item) => item.id === normalizedRsvp.id);
				if (index === -1) {
					// If not found, add it (shouldn't happen, but handle gracefully)
					return [...prev, normalizedRsvp];
				}
				// Replace the existing RSVP with the updated one
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
								? transformReservationForStorage(normalizedRsvp)
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

	// Use shared status color classes function
	const getStatusColorClasses = useCallback(
		(
			status: number | null | undefined,
			includeInteractions: boolean = true,
		): string => {
			return getRsvpStatusColorClasses(status, includeInteractions);
		},
		[],
	);

	const handleCancelClick = useCallback((e: React.MouseEvent, rsvp: Rsvp) => {
		e.stopPropagation(); // Prevent triggering edit dialog
		setReservationToCancel(rsvp);
		setCancelDialogOpen(true);
	}, []);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	// Function to perform RSVP update (extracted for reuse)
	const performRsvpUpdate = useCallback(
		async (rsvp: Rsvp, newRsvpTime: Date) => {
			try {
				setIsUpdating(true);
				// Update RSVP time via server action
				const result = await updateReservationAction({
					id: rsvp.id,
					facilityId: rsvp.facilityId,
					serviceStaffId: rsvp.serviceStaffId,
					numOfAdult: rsvp.numOfAdult ?? 1,
					numOfChild: rsvp.numOfChild ?? 0,
					rsvpTime: newRsvpTime,
					message: rsvp.message,
				});

				if (result?.serverError) {
					toastError({
						description: result.serverError,
					});
					logger.error("Failed to update RSVP via server action", {
						metadata: {
							rsvpId: rsvp.id,
							serverError: result.serverError,
						},
						tags: ["dnd", "error", "server-action"],
					});
					return;
				}

				if (result?.data?.rsvp) {
					handleReservationUpdated(result.data.rsvp as Rsvp);
					toastSuccess({
						description:
							t("rsvp_time_updated") ||
							"Reservation time updated successfully!",
					});
				}
			} catch (error) {
				toastError({
					description:
						t("failed_to_update_rsvp") || "Failed to update reservation time",
				});
				logger.error("Error updating RSVP via server action", {
					metadata: {
						rsvpId: rsvp.id,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["dnd", "error", "server-action"],
				});
			} finally {
				setIsUpdating(false);
			}
		},
		[handleReservationUpdated, t],
	);

	// Handle confirmation to move RSVP into cancellation window
	const handleMoveIntoCancelWindowConfirm = useCallback(async () => {
		if (!pendingUpdate) return;

		await performRsvpUpdate(pendingUpdate.rsvp, pendingUpdate.newRsvpTime);
		setMoveIntoCancelWindowConfirmOpen(false);
		setPendingUpdate(null);
	}, [pendingUpdate, performRsvpUpdate]);

	// Handle drag end event - update RSVP time
	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over || !active) {
				return;
			}

			// Parse drag data
			const draggedRsvpId = active.id as string;
			const dropTargetId = over.id as string;

			// Extract actual RSVP ID from draggable ID (format: "rsvp-{id}")
			const rsvpIdMatch = draggedRsvpId.toString().match(/^rsvp-(.+)$/);
			if (!rsvpIdMatch) {
				logger.error("Invalid draggable ID format", {
					metadata: { draggedRsvpId },
					tags: ["dnd", "error"],
				});
				return;
			}

			const actualRsvpId = rsvpIdMatch[1];

			// Find the RSVP being dragged
			const draggedRsvp = rsvps.find((r) => r.id === actualRsvpId);
			if (!draggedRsvp) {
				logger.error("Dragged RSVP not found", {
					metadata: { actualRsvpId },
					tags: ["dnd", "error"],
				});
				return;
			}

			// Check if RSVP is currently within cancellation window - block any update
			if (rsvpSettings?.canCancel && rsvpSettings?.cancelHours) {
				const now = getUtcNow();
				const rsvpTimeDate = epochToDate(
					typeof draggedRsvp.rsvpTime === "number"
						? BigInt(draggedRsvp.rsvpTime)
						: draggedRsvp.rsvpTime instanceof Date
							? BigInt(draggedRsvp.rsvpTime.getTime())
							: draggedRsvp.rsvpTime,
				);
				if (rsvpTimeDate) {
					const hoursUntilReservation =
						(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);
					const cancelHours = rsvpSettings.cancelHours ?? 24;
					if (hoursUntilReservation < cancelHours) {
						toastError({
							description:
								t("cannot_edit_reservation_within_cancel_window") ||
								`Cannot edit reservation within ${cancelHours} hours of reservation time`,
						});
						return;
					}
				}
			}

			// Only allow dragging if user can edit this reservation
			if (!canEditReservation(draggedRsvp)) {
				toastError({
					description:
						t("cannot_edit_reservation") || "Cannot edit this reservation",
				});
				return;
			}

			// Skip if dropped on completed RSVP (non-draggable)
			if (draggedRsvp.status === RsvpStatus.Completed) {
				return;
			}

			// Parse drop target: format is "slot-{dayISO}-{timeSlot}"
			// e.g., "slot-2026-01-18T00:00:00.000Z-14:00"
			const dropTargetStr = dropTargetId.toString();
			if (!dropTargetStr.startsWith("slot-")) {
				logger.warn("Invalid drop target ID format", {
					metadata: { dropTargetId },
					tags: ["dnd", "warn"],
				});
				toastError({
					description:
						t("invalid_drop_target") ||
						"Invalid drop target. Please try again.",
				});
				return;
			}

			// Extract timeSlot from the end (e.g., "14:00")
			const timeSlotMatch = dropTargetStr.match(/-(\d{1,2}:\d{2})$/);
			if (!timeSlotMatch) {
				logger.warn("Invalid time slot format in drop target ID", {
					metadata: { dropTargetId },
					tags: ["dnd", "warn"],
				});
				toastError({
					description:
						t("invalid_drop_target") ||
						"Invalid drop target. Please try again.",
				});
				return;
			}

			const timeSlot = timeSlotMatch[1];
			// Extract the day ISO string (everything between "slot-" and the last "-HH:MM")
			const dayISO = dropTargetStr.slice(5, -timeSlot.length - 1); // Remove "slot-" prefix and "-{timeSlot}" suffix
			const dropDay = new Date(dayISO);

			if (isNaN(dropDay.getTime())) {
				toastError({
					description:
						t("invalid_date_format") ||
						"Invalid date format. Please try again.",
				});
				logger.error("Invalid drop day parsed from ID", {
					metadata: { dayISO, dropTargetId },
					tags: ["dnd", "error"],
				});
				return;
			}

			let newRsvpTime: Date;
			try {
				// Convert day + timeSlot to UTC date for new rsvpTime
				newRsvpTime = dayAndTimeSlotToUtc(dropDay, timeSlot, storeTimezone);
			} catch (error) {
				toastError({
					description:
						t("failed_to_calculate_rsvp_time") ||
						"Failed to calculate new reservation time",
				});
				logger.error("Failed to convert day and time slot to UTC", {
					metadata: {
						dropDay,
						timeSlot,
						storeTimezone,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["dnd", "error"],
				});
				return;
			}

			// Validate newRsvpTime is a valid Date
			if (!newRsvpTime || isNaN(newRsvpTime.getTime())) {
				toastError({
					description:
						t("failed_to_calculate_rsvp_time") ||
						"Failed to calculate new reservation time",
				});
				logger.error("Calculated newRsvpTime is invalid", {
					metadata: { newRsvpTime, dropDay, timeSlot, storeTimezone },
					tags: ["dnd", "error"],
				});
				return;
			}

			// Helper to convert rsvpTime/arriveTime to Date (handles BigInt, number, string, Date)
			const convertToDate = (
				value: Date | bigint | number | string | null | undefined,
			): Date | null => {
				if (!value) return null;
				if (value instanceof Date) return value;
				if (typeof value === "bigint") return epochToDate(value);
				if (typeof value === "number") return new Date(value);
				if (typeof value === "string") {
					// Try parsing as ISO string first
					const parsed = new Date(value);
					if (!isNaN(parsed.getTime())) return parsed;
					// Try parsing as epoch number string
					const epochNum = Number.parseInt(value, 10);
					if (!isNaN(epochNum)) return new Date(epochNum);
					return null;
				}
				return null;
			};

			// Check if RSVP time actually changed
			const oldRsvpTime = convertToDate(draggedRsvp.rsvpTime);
			if (
				oldRsvpTime &&
				Math.abs(oldRsvpTime.getTime() - newRsvpTime.getTime()) < 60000
			) {
				// Less than 1 minute difference, no need to update
				return;
			}

			// Double-check: Block update if RSVP is currently within cancellation window
			// (This is a safety check in case the drag started before the window was reached)
			if (rsvpSettings?.canCancel && rsvpSettings?.cancelHours) {
				const now = getUtcNow();
				const rsvpTimeDate = epochToDate(
					typeof draggedRsvp.rsvpTime === "number"
						? BigInt(draggedRsvp.rsvpTime)
						: draggedRsvp.rsvpTime instanceof Date
							? BigInt(draggedRsvp.rsvpTime.getTime())
							: draggedRsvp.rsvpTime,
				);
				if (rsvpTimeDate) {
					const hoursUntilReservation =
						(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);
					const cancelHours = rsvpSettings.cancelHours ?? 24;
					if (hoursUntilReservation < cancelHours) {
						toastError({
							description:
								t("cannot_edit_reservation_within_cancel_window") ||
								`Cannot edit reservation within ${cancelHours} hours of reservation time`,
						});
						return;
					}
				}
			}

			// Check if NEW time slot would put RSVP within cancellation window
			// If yes, ask for user consent before proceeding
			if (rsvpSettings?.canCancel && rsvpSettings?.cancelHours) {
				const now = getUtcNow();
				const hoursUntilNewReservation =
					(newRsvpTime.getTime() - now.getTime()) / (1000 * 60 * 60);
				const cancelHours = rsvpSettings.cancelHours ?? 24;
				if (hoursUntilNewReservation < cancelHours) {
					// Store pending update and show confirmation dialog
					setPendingUpdate({ rsvp: draggedRsvp, newRsvpTime });
					setMoveIntoCancelWindowConfirmOpen(true);
					return;
				}
			}

			// Validate facility availability (if facility is selected)
			if (draggedRsvp.facilityId) {
				const facility = facilities.find(
					(f) => f.id === draggedRsvp.facilityId,
				);
				if (facility) {
					// Check facility business hours
					const facilityHoursCheck = checkTimeAgainstBusinessHours(
						facility.businessHours,
						newRsvpTime,
						storeTimezone,
					);
					if (!facilityHoursCheck.isValid) {
						toastError({
							description:
								t("rsvp_time_outside_business_hours_facility") ||
								"The selected time is outside business hours for this facility",
						});
						return;
					}

					// Check if facility is already booked at the new time slot
					// Convert newRsvpTime to epoch for comparison
					const newRsvpTimeEpoch = dateToEpoch(newRsvpTime);
					if (newRsvpTimeEpoch) {
						const facilityDuration =
							facility.defaultDuration ?? defaultDuration;
						const durationMs = facilityDuration * 60 * 1000;
						const slotStart = Number(newRsvpTimeEpoch);
						const slotEnd = slotStart + durationMs;

						// Find conflicting reservations for this facility (excluding the dragged RSVP)
						const conflictingReservations = rsvps.filter((existingRsvp) => {
							// Exclude the dragged RSVP itself
							if (existingRsvp.id === draggedRsvp.id) {
								return false;
							}

							// Exclude cancelled reservations
							if (existingRsvp.status === RsvpStatus.Cancelled) {
								return false;
							}

							// Only check reservations for the same facility
							if (existingRsvp.facilityId !== draggedRsvp.facilityId) {
								return false;
							}

							// Convert existing reservation time to epoch
							let existingRsvpTime: bigint;
							if (existingRsvp.rsvpTime instanceof Date) {
								existingRsvpTime = BigInt(existingRsvp.rsvpTime.getTime());
							} else if (typeof existingRsvp.rsvpTime === "number") {
								existingRsvpTime = BigInt(existingRsvp.rsvpTime);
							} else if (typeof existingRsvp.rsvpTime === "bigint") {
								existingRsvpTime = existingRsvp.rsvpTime;
							} else {
								return false;
							}

							const existingStart = Number(existingRsvpTime);
							const existingDuration =
								existingRsvp.Facility?.defaultDuration ??
								facility.defaultDuration ??
								defaultDuration;
							const existingDurationMs = existingDuration * 60 * 1000;
							const existingEnd = existingStart + existingDurationMs;

							// Check if slots overlap (they overlap if one starts before the other ends)
							return slotStart < existingEnd && slotEnd > existingStart;
						});

						if (conflictingReservations.length > 0) {
							toastError({
								description:
									t("rsvp_time_slot_already_booked_facility") ||
									"This time slot is already booked for this facility. Please select a different time.",
							});
							return;
						}
					}
				}
			}

			// Validate service staff availability (if service staff is selected)
			if (draggedRsvp.serviceStaffId) {
				// Find the service staff to check business hours
				// Note: We need to fetch service staff details or check from existing data
				// For now, we'll check if there are conflicting reservations for this service staff
				const newRsvpTimeEpoch = dateToEpoch(newRsvpTime);
				if (newRsvpTimeEpoch) {
					const slotStart = Number(newRsvpTimeEpoch);
					const slotDuration = defaultDuration * 60 * 1000;
					const slotEnd = slotStart + slotDuration;

					// Find conflicting reservations for this service staff (excluding the dragged RSVP)
					const conflictingReservations = rsvps.filter((existingRsvp) => {
						// Exclude the dragged RSVP itself
						if (existingRsvp.id === draggedRsvp.id) {
							return false;
						}

						// Exclude cancelled reservations
						if (existingRsvp.status === RsvpStatus.Cancelled) {
							return false;
						}

						// Only check reservations for the same service staff
						if (existingRsvp.serviceStaffId !== draggedRsvp.serviceStaffId) {
							return false;
						}

						// Convert existing reservation time to epoch
						let existingRsvpTime: bigint;
						if (existingRsvp.rsvpTime instanceof Date) {
							existingRsvpTime = BigInt(existingRsvp.rsvpTime.getTime());
						} else if (typeof existingRsvp.rsvpTime === "number") {
							existingRsvpTime = BigInt(existingRsvp.rsvpTime);
						} else if (typeof existingRsvp.rsvpTime === "bigint") {
							existingRsvpTime = existingRsvp.rsvpTime;
						} else {
							return false;
						}

						const existingStart = Number(existingRsvpTime);
						// Get duration from facility or use default
						const existingDuration =
							existingRsvp.Facility?.defaultDuration ?? defaultDuration;
						const existingDurationMs = existingDuration * 60 * 1000;
						const existingEnd = existingStart + existingDurationMs;

						// Check if slots overlap (they overlap if one starts before the other ends)
						return slotStart < existingEnd && slotEnd > existingStart;
					});

					if (conflictingReservations.length > 0) {
						toastError({
							description:
								t("rsvp_time_slot_already_booked_single_service") ||
								t("no_service_staff_available_at_selected_time") ||
								"This time slot is already booked for this service staff. Please select a different time.",
						});
						return;
					}
				}

				// Check service staff business hours if available
				// Note: Service staff business hours would need to be fetched or passed as prop
				// For now, we rely on the server-side validation which will catch this
			}

			// Proceed with update (this function is called after confirmation if needed)
			await performRsvpUpdate(draggedRsvp, newRsvpTime);
		},
		[
			rsvps,
			storeTimezone,
			handleReservationUpdated,
			t,
			canEditReservation,
			facilities,
			defaultDuration,
		],
	);

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
				// Simplified: If user can click delete (canCancelReservation returns true),
				// they have permission - no need to send name/phone for verification
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
					// Mark as deleted to prevent it from being re-added from server
					setDeletedReservationIds((prev) => {
						const updated = new Set(prev);
						updated.add(reservationToCancel.id);
						return updated;
					});
					// Remove from local state
					setRsvps((prev) =>
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
						// If no data returned, mark as deleted and remove from list
						setDeletedReservationIds((prev) => {
							const updated = new Set(prev);
							updated.add(reservationToCancel.id);
							return updated;
						});
						setRsvps((prev) =>
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
		user,
		removeReservationFromLocalStorage,
	]);

	// Render cancel button component
	const renderCancelButton = useCallback(
		(rsvp: Rsvp) => {
			if (!canCancelReservation(rsvp)) return null;

			return (
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-0.5 right-0.5 h-6 w-6 min-h-[32px] min-w-[32px] sm:h-5 sm:w-5 text-destructive hover:text-destructive p-0 z-10"
					onClick={(e) => {
						e.stopPropagation();
						handleCancelClick(e, rsvp);
					}}
					title={
						rsvp.status === RsvpStatus.Pending
							? t("rsvp_delete_reservation")
							: t("rsvp_cancel_reservation")
					}
				>
					<IconTrash className="h-3 w-3 sm:h-4 sm:w-4" />
				</Button>
			);
		},
		[t, handleCancelClick, canCancelReservation],
	);

	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			{/* Week Navigation */}
			<div className="flex flex-col gap-0 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-0.5 sm:gap-1 font-mono text-sm flex-wrap">
					<Button
						variant="outline"
						size="icon"
						onClick={handlePreviousWeek}
						disabled={isDayInPast}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<Button
						variant="outline"
						onClick={handleToday}
						className="h-10 px-3 text-sm sm:h-9"
					>
						{t("today")}
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={handleNextWeek}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<span className="ml-2 text-base font-semibold sm:ml-4 sm:text-lg">
						<span className="hidden sm:inline">
							{format(weekStart, "MMMdd", { locale: calendarLocale })} -{" "}
							{format(weekEnd, datetimeFormat, { locale: calendarLocale })}
						</span>
						<span className="sm:hidden">
							{format(weekStart, "MMM dd", { locale: calendarLocale })} -{" "}
							{format(weekEnd, "MMM dd", { locale: calendarLocale })}
						</span>
					</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="border rounded-lg overflow-hidden">
					<div className="overflow-x-auto -mx-3 sm:mx-0">
						<table className="w-full border-collapse min-w-[390px] sm:min-w-full">
							<thead>
								<tr>
									<th className="w-12 sm:w-20 border-b border-r p-1 sm:p-2 text-right text-base sm:text-sm font-medium text-muted-foreground sticky left-0 bg-background z-10">
										{t("time")}
									</th>
									{weekDays.map((day) => {
										const isDayToday = todayDays.has(day.toISOString());
										return (
											<th
												key={day.toISOString()}
												className={cn(
													"border-b border-r p-0.5 sm:p-2 text-center sm:text-sm font-medium w-[48px] sm:min-w-[110px]",
													isDayToday && "bg-primary/10",
													"last:border-r-0",
												)}
											>
												<div className="flex flex-col">
													<span className="text-[9px] sm:text-xs text-muted-foreground">
														{getDayName(day, t)}
													</span>
													<span
														className={cn(
															"text-xs sm:text-lg font-semibold",
															isDayToday && "text-primary",
														)}
													>
														{getDayNumber(day)}
													</span>
												</div>
											</th>
										);
									})}
								</tr>
							</thead>
							<tbody>
								{timeSlots.map((timeSlot) => (
									<tr key={timeSlot}>
										<td className="border-b border-r p-1 sm:p-2 text-right sm:text-sm text-muted-foreground sticky left-0 bg-background z-10 whitespace-nowrap">
											{timeSlot}
										</td>
										{weekDays.map((day) => {
											const slotRsvps = getRsvpsForSlot(day, timeSlot);
											// Filter out cancelled RSVPs when determining availability
											const activeRsvps = slotRsvps.filter(
												(rsvp) => rsvp.status !== RsvpStatus.Cancelled,
											);
											// Check if this day/time slot is in the past using pre-computed map
											const slotKey = `${day.toISOString()}-${timeSlot}`;
											const isPast = pastSlots.has(slotKey);
											const isDayToday = todayDays.has(day.toISOString());
											return (
												<td
													key={`${day.toISOString()}-${timeSlot}`}
													className={cn(
														"border-b border-r p-0.5 sm:p-1 w-[48px] sm:min-w-[120px] align-top",
														isDayToday && "bg-primary/5",
														"last:border-r-0",
													)}
												>
													<DroppableSlot
														id={`slot-${day.toISOString()}-${timeSlot}`}
													>
														<div className="flex flex-col gap-0.5 sm:gap-1 min-h-[50px] sm:min-h-[60px]">
															{activeRsvps.length > 0 &&
																activeRsvps.map((rsvp) => {
																	const isUserRsvp = isUserReservation(rsvp);
																	const canEdit =
																		!isPast &&
																		canEditReservation(rsvp) &&
																		storeId;
																	const canCancel = canCancelReservation(rsvp);
																	const isCompleted =
																		rsvp.status === RsvpStatus.Completed;
																	const displayName =
																		getReservationDisplayName(rsvp);

																	// If not store owner AND not user's reservation, show as "booked" without details
																	if (!isStoreOwner && !isUserRsvp) {
																		return (
																			<button
																				key={rsvp.id}
																				type="button"
																				disabled
																				className={cn(
																					"text-left p-1.5 sm:p-2 rounded sm:text-xs transition-colors w-full cursor-default",
																					getStatusColorClasses(
																						rsvp.status,
																						false,
																					),
																					isPast && "opacity-50",
																				)}
																			>
																				<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																					{t("booked")}
																				</div>
																			</button>
																		);
																	}

																	// Render as non-clickable for completed RSVPs
																	if (isCompleted) {
																		return (
																			<button
																				key={rsvp.id}
																				type="button"
																				disabled
																				className={cn(
																					"text-left p-1.5 sm:p-2 rounded sm:text-xs transition-colors w-full cursor-default",
																					getStatusColorClasses(
																						rsvp.status,
																						false,
																					),
																					isPast && "opacity-50",
																				)}
																			>
																				<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																					{displayName}
																				</div>
																				{rsvp.Facility?.facilityName && (
																					<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5">
																						{rsvp.Facility.facilityName}
																					</div>
																				)}
																				{rsvp.message && (
																					<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5">
																						{rsvp.message}
																					</div>
																				)}
																			</button>
																		);
																	}

																	// Render dialog for editable RSVPs or non-editable button for others
																	if (canEdit) {
																		// Render card for editable RSVPs (can be dragged)
																		const draggableId = `rsvp-${rsvp.id}`;
																		const isDragging = activeId === draggableId;

																		return (
																			<React.Fragment key={rsvp.id}>
																				<DraggableCard
																					id={draggableId}
																					isDragging={isDragging}
																				>
																					<ReservationDialog
																						storeId={storeId || ""}
																						rsvpSettings={rsvpSettings}
																						storeSettings={storeSettings}
																						facilities={facilities}
																						user={user}
																						rsvp={rsvp}
																						existingReservations={rsvps}
																						storeTimezone={storeTimezone}
																						storeCurrency={storeCurrency}
																						storeUseBusinessHours={
																							storeUseBusinessHours
																						}
																						open={openEditDialogId === rsvp.id}
																						onOpenChange={(open) => {
																							setOpenEditDialogId(
																								open ? rsvp.id : null,
																							);
																						}}
																						onReservationUpdated={(updated) => {
																							setOpenEditDialogId(null);
																							handleReservationUpdated(updated);
																						}}
																						trigger={
																							<div className="relative">
																								{renderCancelButton(rsvp)}
																								<button
																									type="button"
																									onClick={(e) => {
																										e.stopPropagation();
																										setOpenEditDialogId(
																											rsvp.id,
																										);
																									}}
																									className={cn(
																										"cursor-move transition-all w-full rounded border-0 py-0 relative",
																										getStatusColorClasses(
																											rsvp.status,
																											true,
																										),
																										isPast && "opacity-50",
																										isDragging &&
																											"opacity-50 cursor-grabbing",
																										!isDragging &&
																											"hover:shadow-md",
																										"flex flex-col shadow-sm",
																										canCancel && "pr-6",
																									)}
																								>
																									<div className="font-medium truncate leading-tight text-[9px] sm:text-xs p-1.5 sm:p-2">
																										{displayName}
																									</div>
																									{rsvp.Facility
																										?.facilityName && (
																										<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5 px-1.5 sm:px-2">
																											{
																												rsvp.Facility
																													.facilityName
																											}
																										</div>
																									)}
																									{rsvp.message && (
																										<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5 px-1.5 sm:px-2">
																											{rsvp.message}
																										</div>
																									)}
																								</button>
																							</div>
																						}
																					/>
																				</DraggableCard>
																			</React.Fragment>
																		);
																	}

																	// Render non-editable button for other RSVPs (only visible to owner)
																	// But still show delete button if user owns it and can cancel
																	return (
																		<div key={rsvp.id} className="relative">
																			{canCancel && (
																				<Button
																					variant="ghost"
																					size="icon"
																					className="absolute top-0.5 right-0.5 h-6 w-6 min-h-[32px] min-w-[32px] sm:h-5 sm:w-5 text-destructive hover:text-destructive p-0 z-10"
																					onClick={(e) => {
																						e.stopPropagation();
																						handleCancelClick(e, rsvp);
																					}}
																					title={
																						rsvp.status === RsvpStatus.Pending
																							? t("rsvp_delete_reservation")
																							: t("rsvp_cancel_reservation")
																					}
																				>
																					<IconTrash className="h-3 w-3 sm:h-4 sm:w-4" />
																				</Button>
																			)}
																			<button
																				type="button"
																				disabled
																				className={cn(
																					"text-left p-1.5 sm:p-2 rounded sm:text-xs transition-colors w-full cursor-default",
																					getStatusColorClasses(
																						rsvp.status,
																						false,
																					),
																					isPast && "opacity-50",
																					canCancel && "pr-6",
																				)}
																			>
																				<div className="font-medium truncate leading-tight text-[9px] sm:text-xs">
																					{displayName}
																				</div>
																				{rsvp.Facility?.facilityName && (
																					<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5">
																						{rsvp.Facility.facilityName}
																					</div>
																				)}
																				{rsvp.message && (
																					<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5">
																						{rsvp.message}
																					</div>
																				)}
																			</button>
																		</div>
																	);
																})}

															{/* Show "+" button if slot is available and facilities exist */}
															{(() => {
																const canAddMore =
																	activeRsvps.length === 0 ||
																	!singleServiceMode;
																if (!canAddMore || isPast) return null;

																const slotTimeUtc = dayAndTimeSlotToUtc(
																	day,
																	timeSlot,
																	storeTimezone || "Asia/Taipei",
																);
																if (
																	!hasAvailableFacilities(slotTimeUtc, rsvps)
																) {
																	return null;
																}

																if (!canCreateReservation) return null;

																const addButton = (
																	<button
																		type="button"
																		disabled={isPast}
																		className={cn(
																			"w-full h-full sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground flex items-center justify-center",
																			isPast && "cursor-not-allowed opacity-50",
																		)}
																	>
																		+
																	</button>
																);

																return storeId ? (
																	<ReservationDialog
																		storeId={storeId}
																		rsvpSettings={rsvpSettings}
																		storeSettings={storeSettings}
																		facilities={facilities}
																		user={user}
																		defaultRsvpTime={slotTimeUtc}
																		onReservationCreated={
																			handleReservationCreated
																		}
																		existingReservations={rsvps}
																		storeTimezone={storeTimezone}
																		storeCurrency={storeCurrency}
																		storeUseBusinessHours={
																			storeUseBusinessHours
																		}
																		useCustomerCredit={useCustomerCredit}
																		creditExchangeRate={creditExchangeRate}
																		creditServiceExchangeRate={
																			creditServiceExchangeRate
																		}
																		trigger={addButton}
																	/>
																) : (
																	<button
																		type="button"
																		onClick={() =>
																			handleTimeSlotClick(day, timeSlot)
																		}
																		disabled={isPast}
																		className={cn(
																			"w-full h-full sm:min-h-[60px] text-left p-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors text-xs sm:text-sm text-muted-foreground flex items-center justify-center",
																			isPast && "cursor-not-allowed opacity-50",
																		)}
																	>
																		+
																	</button>
																);
															})()}
														</div>
													</DroppableSlot>
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</DndContext>

			{/* Status Legend */}
			<RsvpStatusLegend t={t} />

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

			{/* Move into cancellation window confirmation */}
			<AlertModal
				isOpen={moveIntoCancelWindowConfirmOpen}
				onClose={() => {
					setMoveIntoCancelWindowConfirmOpen(false);
					setPendingUpdate(null);
				}}
				onConfirm={handleMoveIntoCancelWindowConfirm}
				loading={isUpdating}
				title={
					t("confirm_move_into_cancel_window_title") ||
					"Move Reservation into Cancellation Window?"
				}
				description={
					t("confirm_move_into_cancel_window_description", {
						hours: rsvpSettings?.cancelHours ?? 24,
					}) ||
					`Moving this reservation to the selected time will place it within the cancellation window (${rsvpSettings?.cancelHours ?? 24} hours). You may not be able to cancel or edit it later. Do you want to proceed?`
				}
			/>
		</div>
	);
};
