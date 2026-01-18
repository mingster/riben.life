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
import type { Rsvp, StoreFacility } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { RsvpStatusLegend } from "@/components/rsvp-status-legend";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	generateTimeSlots,
	getReservationDisplayName,
	groupRsvpsByDayAndTime,
	checkTimeAgainstBusinessHours,
} from "@/utils/rsvp-utils";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import { CardContent } from "@/components/ui/card";
import {
	getDateInTz,
	getUtcNow,
	getOffsetHours,
	dayAndTimeSlotToUtc,
	dateToEpoch,
	convertToUtc,
	epochToDate,
} from "@/utils/datetime-utils";
import { isWithinReservationTimeWindow } from "@/utils/rsvp-time-window-utils";
import useSWR from "swr";
import { useParams } from "next/navigation";
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
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { deleteRsvpAction } from "@/actions/storeAdmin/rsvp/delete-rsvp";
import { toastError, toastSuccess } from "@/components/toaster";
import { AlertModal } from "@/components/modals/alert-modal";

interface WeekViewCalendarProps {
	reservations: Rsvp[];
	onRsvpCreated?: (rsvp: Rsvp) => void;
	onRsvpUpdated?: (rsvp: Rsvp) => void;
	rsvpSettings: {
		useBusinessHours: boolean;
		rsvpHours: string | null;
		defaultDuration?: number | null;
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		canReserveBefore?: number | null;
		canReserveAfter?: number | null;
		singleServiceMode?: boolean | null;
	} | null;
	storeSettings: { businessHours: string | null } | null;
	storeTimezone: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
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

	// Only apply drag styles after hydration to prevent mismatch
	const style = isHydrated
		? transform
			? {
					transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
					opacity: isDraggingState ? 0.5 : 1,
				}
			: {
					opacity: isDraggingState || isDragging ? 0.5 : 1,
				}
		: {
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

// admin view of WeekViewCalendar
export const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
	reservations,
	onRsvpCreated,
	onRsvpUpdated,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	storeCurrency = "twd",
	storeUseBusinessHours,
	useCustomerCredit = false,
	creditExchangeRate = null,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams();

	// Convert UTC today to store timezone for display
	const todayUtc = useMemo(() => getUtcNow(), []);
	const today = useMemo(
		() => startOfDay(getDateInTz(todayUtc, getOffsetHours(storeTimezone))),
		[todayUtc, storeTimezone],
	);

	const [rsvps, setRsvps] = useState<Rsvp[]>(reservations);

	// Fetch facilities for availability checking
	const facilitiesUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/facilities`;
	const facilitiesFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeFacilities } = useSWR<StoreFacility[]>(
		facilitiesUrl,
		facilitiesFetcher,
	);

	// Sync with prop changes (e.g., when server data is refreshed)
	useEffect(() => {
		setRsvps(reservations);
	}, [reservations]);

	// Handle RSVP updates locally
	const handleRsvpUpdated = useCallback(
		(updated: Rsvp) => {
			setRsvps((prev) =>
				prev.map((item) => (item.id === updated.id ? updated : item)),
			);
			onRsvpUpdated?.(updated);
		},
		[onRsvpUpdated],
	);

	// Handle RSVP creation locally
	const handleRsvpCreated = useCallback(
		(newRsvp: Rsvp) => {
			setRsvps((prev) => {
				const exists = prev.some((item) => item.id === newRsvp.id);
				if (exists) return prev;
				return [newRsvp, ...prev];
			});
			onRsvpCreated?.(newRsvp);
		},
		[onRsvpCreated],
	);

	const [currentDay, setCurrentDay] = useState(() => {
		// Always start with today as the first day
		// Use UTC for consistency, then convert to store timezone for display
		return getUtcNow();
	});
	const [openEditDialogId, setOpenEditDialogId] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [rsvpToDelete, setRsvpToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [moveIntoCancelWindowConfirmOpen, setMoveIntoCancelWindowConfirmOpen] =
		useState(false);
	const [pendingUpdate, setPendingUpdate] = useState<{
		rsvp: Rsvp;
		newRsvpTime: Date;
	} | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	// Helper to convert rsvpTime/arriveTime to Date (handles BigInt, number, string, Date)
	const convertToDate = useCallback(
		(
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
		},
		[],
	);

	// Handle RSVP deletion
	const handleDeleteClick = useCallback(
		(e: React.MouseEvent, rsvpId: string) => {
			e.stopPropagation(); // Prevent card onClick from firing
			setRsvpToDelete(rsvpId);
			setDeleteConfirmOpen(true);
		},
		[],
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (!rsvpToDelete) return;

		try {
			setIsDeleting(true);
			const result = await deleteRsvpAction(String(params.storeId), {
				id: rsvpToDelete,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title") || "Error",
					description: result.serverError,
				});
				return;
			}

			// Remove RSVP from local state
			setRsvps((prev) => prev.filter((r) => r.id !== rsvpToDelete));
			toastSuccess({
				title: (t("rsvp") || "RSVP") + " " + (t("deleted") || "deleted"),
				description: "",
			});
			setDeleteConfirmOpen(false);
			setRsvpToDelete(null);
		} catch (error: unknown) {
			toastError({
				title: t("error_title") || "Error",
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsDeleting(false);
		}
	}, [rsvpToDelete, params.storeId, t]);

	// Configure drag sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px movement before activating drag
			},
		}),
	);

	const useBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	const rsvpHours = rsvpSettings?.rsvpHours ?? null;
	const businessHours = storeSettings?.businessHours ?? null;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60; // Default to 60 minutes
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
			// If facilities haven't loaded yet, assume available (to avoid hiding buttons prematurely)
			if (!storeFacilities) {
				return true;
			}

			// If no facilities exist at all, allow reservations without facilities
			if (storeFacilities.length === 0) {
				return true;
			}

			// First filter by business hours availability
			let available = storeFacilities.filter((facility: StoreFacility) =>
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
			// Filter out cancelled reservations when determining availability
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
			storeFacilities,
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

	// Function to perform RSVP update (extracted for reuse)
	const performRsvpUpdate = useCallback(
		async (rsvp: Rsvp, newRsvpTime: Date) => {
			try {
				setIsUpdating(true);
				// Convert arriveTime to Date
				const arriveTimeDate = convertToDate(rsvp.arriveTime);

				// Update RSVP time via server action
				const result = await updateRsvpAction(String(params.storeId), {
					id: rsvp.id,
					customerId: rsvp.customerId,
					facilityId: rsvp.facilityId,
					serviceStaffId: rsvp.serviceStaffId,
					numOfAdult: rsvp.numOfAdult ?? 1,
					numOfChild: rsvp.numOfChild ?? 0,
					rsvpTime: newRsvpTime,
					arriveTime: arriveTimeDate,
					status: rsvp.status,
					message: rsvp.message,
					alreadyPaid: rsvp.alreadyPaid ?? false,
					confirmedByStore: rsvp.confirmedByStore ?? false,
					confirmedByCustomer: rsvp.confirmedByCustomer ?? false,
					facilityCost: rsvp.facilityCost ? Number(rsvp.facilityCost) : null,
					pricingRuleId: rsvp.pricingRuleId,
				});

				if (result?.serverError) {
					toastError({
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rsvp) {
					// Update local state
					handleRsvpUpdated(result.data.rsvp as Rsvp);
					toastSuccess({
						description: t("rsvp_time_updated") || "Reservation time updated",
					});
				}
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: "Failed to update reservation time",
				});
			} finally {
				setIsUpdating(false);
			}
		},
		[handleRsvpUpdated, t, params.storeId, convertToDate],
	);

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
				return;
			}

			const actualRsvpId = rsvpIdMatch[1];

			// Find the RSVP being dragged
			const draggedRsvp = rsvps.find((r) => r.id === actualRsvpId);
			if (!draggedRsvp) {
				return;
			}

			// Check if RSVP is currently within cancellation window - block any update
			// (Check before calculating newRsvpTime to fail fast)
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

			// Skip if dropped on completed RSVP (non-draggable)
			if (draggedRsvp.status === RsvpStatus.Completed) {
				return;
			}

			// Parse drop target: format is "slot-{dayISO}-{timeSlot}"
			// e.g., "slot-2026-01-18T00:00:00.000Z-14:00"
			// Note: ISO string has dashes, so we need to find the last occurrence of "-" before the time slot
			// Time slot format is always "HH:MM", so we can search backwards from the colon
			const dropTargetStr = dropTargetId.toString();
			if (!dropTargetStr.startsWith("slot-")) {
				return;
			}

			// Find the time slot (format: "HH:MM" or "H:MM") - it's after the last dash and contains a colon
			// Use a regex that matches the pattern from the end: "-\d{1,2}:\d{2}$"
			const timeSlotMatch = dropTargetStr.match(/-(\d{1,2}:\d{2})$/);
			if (!timeSlotMatch) {
				toastError({
					description:
						t("invalid_drop_target") ||
						"Invalid drop target. Please try again.",
				});
				return;
			}

			const timeSlot = timeSlotMatch[1];
			// Extract the day ISO string (everything between "slot-" and the last "-HH:MM")
			// Remove "slot-" prefix (5 chars) and "-{timeSlot}" suffix (1 dash + timeSlot length)
			const dayISO = dropTargetStr.slice(5, -(timeSlot.length + 1));
			const dropDay = new Date(dayISO);

			if (isNaN(dropDay.getTime())) {
				toastError({
					description:
						t("invalid_date_format") ||
						"Invalid date format. Please try again.",
				});
				return;
			}

			// Convert day + timeSlot to UTC date for new rsvpTime
			let newRsvpTime: Date;
			try {
				newRsvpTime = dayAndTimeSlotToUtc(dropDay, timeSlot, storeTimezone);
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: t("failed_to_calculate_rsvp_time") ||
								"Failed to calculate new reservation time",
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
				return;
			}

			// Check if RSVP time actually changed
			const oldRsvpTime = convertToDate(draggedRsvp.rsvpTime);
			if (
				oldRsvpTime &&
				Math.abs(oldRsvpTime.getTime() - newRsvpTime.getTime()) < 60000
			) {
				// Less than 1 minute difference, no need to update
				return;
			}

			// Check if RSVP is within cancellation window (cannot edit within cancelHours)
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

				// Check if NEW time slot would put RSVP within cancellation window
				// If yes, ask for user consent before proceeding
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
			if (draggedRsvp.facilityId && storeFacilities) {
				const facility = storeFacilities.find(
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
			params.storeId,
			handleRsvpUpdated,
			t,
			rsvpSettings,
			storeFacilities,
			defaultDuration,
			singleServiceMode,
			convertToDate,
			performRsvpUpdate,
		],
	);

	// Handle drag start event
	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	// Handle confirmation to move RSVP into cancellation window
	const handleMoveIntoCancelWindowConfirm = useCallback(async () => {
		if (!pendingUpdate) return;

		await performRsvpUpdate(pendingUpdate.rsvp, pendingUpdate.newRsvpTime);
		setMoveIntoCancelWindowConfirmOpen(false);
		setPendingUpdate(null);
	}, [pendingUpdate, performRsvpUpdate]);

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
											// Create unique drop target ID for this slot
											const slotDropId = `slot-${day.toISOString()}-${timeSlot}`;

											return (
												<td
													key={`${day.toISOString()}-${timeSlot}`}
													className={cn(
														"border-b border-r p-0.5 sm:p-1 w-[48px] sm:min-w-[120px] align-top",
														isDayToday && "bg-primary/5",
														"last:border-r-0",
													)}
												>
													<DroppableSlot id={slotDropId}>
														<div className="flex flex-col gap-0.5 sm:gap-1 min-h-[50px] sm:min-h-[60px]">
															{activeRsvps.length > 0 &&
																activeRsvps.map((rsvp) => {
																	const isCompleted =
																		rsvp.status === RsvpStatus.Completed;
																	const displayName =
																		getReservationDisplayName(rsvp);

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
																				{rsvp.ServiceStaff?.User?.name && (
																					<div className="text-muted-foreground truncate text-[9px] sm:leading-tight mt-0.5">
																						{rsvp.ServiceStaff.User.name}
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

																	// Render card for editable RSVPs
																	const draggableId = `rsvp-${rsvp.id}`;
																	const isDragging = activeId === draggableId;

																	return (
																		<React.Fragment key={rsvp.id}>
																			<DraggableCard
																				id={draggableId}
																				isDragging={isDragging}
																			>
																				<AdminEditRsvpDialog
																					storeId={String(params.storeId)}
																					rsvpSettings={rsvpSettings}
																					storeSettings={storeSettings || null}
																					rsvp={rsvp}
																					existingReservations={rsvps}
																					onReservationUpdated={(updated) => {
																						setOpenEditDialogId(null);
																						handleRsvpUpdated(updated);
																					}}
																					storeTimezone={storeTimezone}
																					storeCurrency={storeCurrency}
																					storeUseBusinessHours={
																						storeUseBusinessHours
																					}
																					useCustomerCredit={useCustomerCredit}
																					creditExchangeRate={
																						creditExchangeRate
																					}
																					open={openEditDialogId === rsvp.id}
																					onOpenChange={(open) => {
																						setOpenEditDialogId(
																							open ? rsvp.id : null,
																						);
																					}}
																					trigger={
																						<div
																							className={cn(
																								"cursor-move transition-all w-full rounded border-0 py-0 relative",
																								// Use status color classes (includes border-l-2 and background/text colors matching legend)
																								getStatusColorClasses(
																									rsvp.status,
																									true,
																								),
																								isPast && "opacity-50",
																								isDragging &&
																									"opacity-50 cursor-grabbing",
																								// Add hover shadow only when not dragging
																								!isDragging &&
																									"hover:shadow-md",
																								// Card-like styling without default Card backgrounds
																								"flex flex-col shadow-sm",
																							)}
																							onClick={(e) => {
																								e.stopPropagation();
																								setOpenEditDialogId(rsvp.id);
																							}}
																						>
																							{/* Delete button - positioned in top-right corner */}
																							<Button
																								variant="ghost"
																								size="icon"
																								className="absolute top-0 right-0 h-5 w-5 sm:h-6 sm:w-6 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-70 hover:opacity-100 z-10"
																								onClick={(e) =>
																									handleDeleteClick(e, rsvp.id)
																								}
																								title={t("delete") || "Delete"}
																							>
																								<IconTrash className="h-3 w-3 sm:h-4 sm:w-4" />
																							</Button>
																							<CardContent className="p-1.5 sm:p-2 space-y-0.5">
																								<div className="font-medium truncate leading-tight text-[9px] sm:text-xs pr-5 sm:pr-6">
																									{displayName}
																								</div>
																								{rsvp.Facility
																									?.facilityName && (
																									<div className="text-muted-foreground truncate text-[9px] sm:leading-tight">
																										{rsvp.Facility.facilityName}
																									</div>
																								)}
																								{rsvp.ServiceStaff?.User
																									?.name && (
																									<div className="text-muted-foreground truncate text-[9px] sm:leading-tight">
																										{
																											rsvp.ServiceStaff.User
																												.name
																										}
																									</div>
																								)}
																								{rsvp.message && (
																									<div className="text-muted-foreground truncate text-[9px] sm:leading-tight">
																										{rsvp.message}
																									</div>
																								)}
																							</CardContent>
																						</div>
																					}
																				/>
																			</DraggableCard>
																		</React.Fragment>
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

																// Check if this time slot is within the reservation window
																const isWithinWindow =
																	isWithinReservationTimeWindow(
																		rsvpSettings,
																		slotTimeUtc,
																	);

																if (!isWithinWindow) {
																	// Slot is outside the allowed window - show empty disabled state
																	return (
																		<button
																			type="button"
																			disabled
																			className="w-full h-full sm:min-h-[60px] text-left p-2 rounded text-xs sm:text-sm text-muted-foreground/50 flex items-center justify-center cursor-not-allowed opacity-50"
																			title={
																				t("rsvp_time_outside_window") ||
																				"This time slot is outside the allowed reservation window"
																			}
																		></button>
																	);
																}

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

																return (
																	<AdminEditRsvpDialog
																		storeId={String(params.storeId)}
																		rsvpSettings={rsvpSettings}
																		storeSettings={storeSettings || null}
																		defaultRsvpTime={slotTimeUtc}
																		onReservationCreated={handleRsvpCreated}
																		existingReservations={rsvps}
																		storeTimezone={storeTimezone}
																		storeCurrency={storeCurrency}
																		storeUseBusinessHours={
																			storeUseBusinessHours
																		}
																		useCustomerCredit={useCustomerCredit}
																		creditExchangeRate={creditExchangeRate}
																		trigger={addButton}
																	/>
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

			{/* Delete Confirmation Modal */}
			<AlertModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setRsvpToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				loading={isDeleting}
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
