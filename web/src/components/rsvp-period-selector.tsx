"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/providers/i18n-provider";
import {
	convertToUtc,
	dateToEpoch,
	formatUtcDateToDateTimeLocal,
} from "@/utils/datetime-utils";
import {
	endOfMonth,
	endOfWeek,
	endOfYear,
	startOfMonth,
	startOfWeek,
	startOfYear,
} from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { epochToDate } from "@/utils/datetime-utils";
import { subDays, addDays } from "date-fns";

export type PeriodType = "week" | "month" | "year" | "all" | "custom";

export interface PeriodRange {
	startEpoch: bigint | null;
	endEpoch: bigint | null;
}

export interface PeriodRanges {
	week: PeriodRange;
	month: PeriodRange;
	year: PeriodRange;
	all: PeriodRange;
}

export interface PeriodRangeWithDates {
	periodType: PeriodType;
	startDate: Date | null;
	endDate: Date | null;
	startEpoch: bigint | null;
	endEpoch: bigint | null;
}

interface RsvpPeriodSelectorProps {
	storeTimezone: string;
	storeId?: string; // Required for localStorage persistence
	className?: string;

	// Controlled mode: If periodType is provided, component is controlled
	periodType?: PeriodType;
	onPeriodChange?: (period: PeriodType) => void;

	// Controlled mode: If startDate/endDate are provided, component is controlled
	startDate?: Date | null;
	endDate?: Date | null;
	onStartDateChange?: (date: Date | null) => void;
	onEndDateChange?: (date: Date | null) => void;

	// Callback when period or date range changes (provides complete range info)
	onPeriodRangeChange?: (range: PeriodRangeWithDates) => void;

	// Configuration
	defaultPeriod?: PeriodType; // Default period if not loading from localStorage
	allowCustom?: boolean; // Whether to allow custom period selection (default: true)
	customDefaultDates?: { startDate: Date; endDate: Date } | null; // Default dates for custom period (defaults to past 10 days to future 30 days)
}

/**
 * Reusable period selector component for RSVP-related features
 * Provides buttons to select week, month, year, all, or custom periods
 * Manages period state and date ranges internally (with localStorage persistence)
 * Supports both controlled and uncontrolled modes
 */
export function RsvpPeriodSelector({
	storeTimezone,
	storeId,
	className,
	periodType: controlledPeriodType,
	onPeriodChange: controlledOnPeriodChange,
	startDate: controlledStartDate,
	endDate: controlledEndDate,
	onStartDateChange: controlledOnStartDateChange,
	onEndDateChange: controlledOnEndDateChange,
	onPeriodRangeChange,
	defaultPeriod = "month",
	allowCustom = true,
	customDefaultDates,
}: RsvpPeriodSelectorProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const [popoverOpen, setPopoverOpen] = useState(false);

	// Track if initialization has completed to prevent infinite loops
	const hasInitialized = useRef(false);
	// Track if we're currently handling a period change to prevent duplicate notifications
	const isHandlingPeriodChange = useRef(false);

	// Determine if component is in controlled mode
	const isControlledPeriod = controlledPeriodType !== undefined;
	const isControlledDates =
		controlledStartDate !== undefined || controlledEndDate !== undefined;

	// Internal state (for uncontrolled mode)
	// Initialize with stored value if available, otherwise use defaultPeriod
	const getInitialPeriodType = useCallback((): PeriodType => {
		if (isControlledPeriod || typeof window === "undefined")
			return defaultPeriod;
		const stored = storeId
			? localStorage.getItem(`rsvp-period-${storeId}`)
			: null;
		if (stored && ["week", "month", "year", "all", "custom"].includes(stored)) {
			return stored as PeriodType;
		}
		return defaultPeriod;
	}, [isControlledPeriod, storeId, defaultPeriod]);

	const [internalPeriodType, setInternalPeriodType] = useState<PeriodType>(
		getInitialPeriodType(),
	);
	const [internalStartDate, setInternalStartDate] = useState<Date | null>(null);
	const [internalEndDate, setInternalEndDate] = useState<Date | null>(null);

	// Temporary state for date inputs in popover (before applying)
	const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
	const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

	// Use controlled values if provided, otherwise use internal state
	const periodType = isControlledPeriod
		? controlledPeriodType
		: internalPeriodType;
	const startDate = isControlledDates ? controlledStartDate : internalStartDate;
	const endDate = isControlledDates ? controlledEndDate : internalEndDate;

	// Get period ranges for predefined periods
	const periodRanges = useRsvpPeriodRanges(storeTimezone);

	// Helper to get current date/time in store timezone
	const getNowInStoreTimezone = useCallback((): Date => {
		const now = new Date();
		const formatted = formatUtcDateToDateTimeLocal(now, storeTimezone);
		if (!formatted) return now;
		return convertToUtc(formatted, storeTimezone);
	}, [storeTimezone]);

	// Load saved period selection from localStorage (only in uncontrolled mode)
	const getStoredPeriodType = useCallback((): PeriodType | null => {
		if (isControlledPeriod || !storeId || typeof window === "undefined")
			return null;
		const stored = localStorage.getItem(`rsvp-period-${storeId}`);
		if (stored && ["week", "month", "year", "all", "custom"].includes(stored)) {
			return stored as PeriodType;
		}
		return null;
	}, [isControlledPeriod, storeId]);

	// Load saved custom dates from localStorage (only in uncontrolled mode)
	const getStoredCustomDates = useCallback((): {
		startDate: Date;
		endDate: Date;
	} | null => {
		if (isControlledDates || !storeId || typeof window === "undefined")
			return null;
		const storedStart = localStorage.getItem(
			`rsvp-history-startDate-${storeId}`,
		);
		const storedEnd = localStorage.getItem(`rsvp-history-endDate-${storeId}`);
		if (storedStart && storedEnd) {
			try {
				const start = new Date(storedStart);
				const end = new Date(storedEnd);
				if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
					return { startDate: start, endDate: end };
				}
			} catch {
				// Invalid dates
			}
		}
		return null;
	}, [isControlledDates, storeId]);

	// Initialize from localStorage on mount (uncontrolled mode only)
	useEffect(() => {
		if (isControlledPeriod || !isHydrated || hasInitialized.current) return;

		hasInitialized.current = true;

		const storedPeriod = getStoredPeriodType();
		if (storedPeriod) {
			setInternalPeriodType(storedPeriod);
			let loadedStartDate: Date | null = null;
			let loadedEndDate: Date | null = null;

			// If stored period is custom, try to load custom dates
			if (storedPeriod === "custom") {
				const storedDates = getStoredCustomDates();
				if (storedDates) {
					loadedStartDate = storedDates.startDate ?? null;
					loadedEndDate = storedDates.endDate ?? null;
					setInternalStartDate(loadedStartDate);
					setInternalEndDate(loadedEndDate);
					// Notify parent after state updates (done via useEffect below)
					// Note: useEffect will handle notification after state settles
					return;
				}
			}

			// For predefined periods (week/month/year), calculate date range
			if (storedPeriod !== "all" && storedPeriod !== "custom") {
				const range = periodRanges[storedPeriod];
				if (range?.startEpoch && range?.endEpoch) {
					const startEpochDate = epochToDate(range.startEpoch);
					const endEpochDate = epochToDate(range.endEpoch);
					if (startEpochDate && endEpochDate) {
						loadedStartDate = startEpochDate;
						loadedEndDate = endEpochDate;
						setInternalStartDate(loadedStartDate);
						setInternalEndDate(loadedEndDate);
					}
				}
			} else if (storedPeriod === "all") {
				loadedStartDate = null;
				loadedEndDate = null;
				setInternalStartDate(null);
				setInternalEndDate(null);
			}
			// Notify parent after state updates (done via useEffect below)
			// Note: useEffect will handle notification after state settles
			return;
		}

		// If no stored period, initialize with defaultPeriod's range
		const initialPeriod = getInitialPeriodType();
		if (initialPeriod !== "all" && initialPeriod !== "custom") {
			const range = periodRanges[initialPeriod];
			if (range?.startEpoch && range?.endEpoch) {
				const startEpochDate = epochToDate(range.startEpoch);
				const endEpochDate = epochToDate(range.endEpoch);
				if (startEpochDate && endEpochDate) {
					setInternalStartDate(startEpochDate);
					setInternalEndDate(endEpochDate);
				}
			}
		} else if (initialPeriod === "all") {
			setInternalStartDate(null);
			setInternalEndDate(null);
		} else {
			// Custom period - initialize default dates if no stored data
			const nowInTz = getNowInStoreTimezone();
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
			const month = getValue("month") - 1;
			const day = getValue("day");
			const hour = getValue("hour");
			const minute = getValue("minute");

			const storeDate = new Date(year, month, day, hour, minute);

			let defaultStartDate: Date;
			let defaultEndDate: Date;

			if (customDefaultDates) {
				defaultStartDate = customDefaultDates.startDate;
				defaultEndDate = customDefaultDates.endDate;
			} else {
				// Default: past 10 days to future 30 days
				defaultStartDate = subDays(storeDate, 10);
				defaultEndDate = addDays(storeDate, 30);
			}

			const startStr = `${defaultStartDate.getFullYear()}-${String(defaultStartDate.getMonth() + 1).padStart(2, "0")}-${String(defaultStartDate.getDate()).padStart(2, "0")}T00:00`;
			const endStr = `${defaultEndDate.getFullYear()}-${String(defaultEndDate.getMonth() + 1).padStart(2, "0")}-${String(defaultEndDate.getDate()).padStart(2, "0")}T23:59`;

			setInternalStartDate(convertToUtc(startStr, storeTimezone));
			setInternalEndDate(convertToUtc(endStr, storeTimezone));
		}
	}, [
		isHydrated,
		isControlledPeriod,
		getStoredPeriodType,
		getStoredCustomDates,
		periodRanges,
		storeTimezone,
		getNowInStoreTimezone,
		customDefaultDates,
		getInitialPeriodType,
	]);

	// Initialize temp dates when popover opens
	useEffect(() => {
		if (popoverOpen) {
			setTempStartDate(startDate ?? null);
			setTempEndDate(endDate ?? null);
		}
	}, [popoverOpen, startDate, endDate]);

	// Helper to notify parent of period range changes
	const notifyPeriodRangeChange = useCallback(
		(period: PeriodType, start: Date | null, end: Date | null) => {
			if (!onPeriodRangeChange) {
				return;
			}

			let startEpoch: bigint | null = null;
			let endEpoch: bigint | null = null;

			if (start && end) {
				startEpoch = dateToEpoch(start);
				endEpoch = dateToEpoch(end);
			} else if (period !== "all" && period !== "custom") {
				// Use predefined period ranges
				const range = periodRanges[period];
				if (range) {
					startEpoch = range.startEpoch;
					endEpoch = range.endEpoch;
				}
			}

			const rangeData = {
				periodType: period,
				startDate: start,
				endDate: end,
				startEpoch,
				endEpoch,
			};

			onPeriodRangeChange(rangeData);
		},
		[onPeriodRangeChange, periodRanges],
	);

	// Notify parent of period range changes (after initialization or when period/dates change)
	useEffect(() => {
		// Skip notification if not hydrated
		if (!isHydrated) return;

		// Skip if callback not provided (uncontrolled mode without callback)
		if (!onPeriodRangeChange) return;

		// Skip notification if in controlled mode (parent manages state via props)
		if (isControlledPeriod || isControlledDates) return;

		// Only notify after initialization has completed
		if (!hasInitialized.current) return;

		// Skip if we're currently handling a period change (handlePeriodChangeInternal will notify explicitly)
		if (isHandlingPeriodChange.current) return;

		// For custom period, ensure we have valid dates before notifying
		// (handlePeriodChangeInternal explicitly notifies for custom, so this is just a safety check)
		if (periodType === "custom" && (!startDate || !endDate)) {
			// Don't notify custom period without dates - handlePeriodChangeInternal will handle it
			return;
		}

		// Notify parent with current period range
		notifyPeriodRangeChange(periodType, startDate ?? null, endDate ?? null);
	}, [
		isHydrated,
		onPeriodRangeChange,
		isControlledPeriod,
		isControlledDates,
		periodType,
		startDate,
		endDate,
		notifyPeriodRangeChange,
	]);

	// Handle period change
	const handlePeriodChangeInternal = useCallback(
		(period: PeriodType) => {
			// Mark that we're handling a period change to prevent useEffect from duplicating notifications
			isHandlingPeriodChange.current = true;

			// For custom period, ensure dates are set BEFORE updating periodType
			// to prevent useEffect from notifying with null dates
			if (period === "custom") {
				// For custom, keep existing dates or use defaults
				let currentStart = isControlledDates
					? controlledStartDate
					: internalStartDate;
				let currentEnd = isControlledDates
					? controlledEndDate
					: internalEndDate;

				// If dates don't exist, initialize with default dates (Jan 1 - Dec 31 of current year)
				if (!currentStart || !currentEnd) {
					const nowInTz = getNowInStoreTimezone();
					const formatter = new Intl.DateTimeFormat("en-CA", {
						timeZone: storeTimezone,
						year: "numeric",
					});
					const parts = formatter.formatToParts(nowInTz);
					const getValue = (type: string): number =>
						Number(parts.find((p) => p.type === type)?.value || "0");
					const year = getValue("year");

					// Default to January 1st to December 31st of the current year
					const startDateLocal = new Date(year, 0, 1); // January 1st
					const endDateLocal = new Date(year, 11, 31); // December 31st

					const startStr = `${startDateLocal.getFullYear()}-${String(startDateLocal.getMonth() + 1).padStart(2, "0")}-${String(startDateLocal.getDate()).padStart(2, "0")}T00:00`;
					const endStr = `${endDateLocal.getFullYear()}-${String(endDateLocal.getMonth() + 1).padStart(2, "0")}-${String(endDateLocal.getDate()).padStart(2, "0")}T23:59`;

					const defaultStartDate = convertToUtc(startStr, storeTimezone);
					const defaultEndDate = convertToUtc(endStr, storeTimezone);

					// Verify dates are valid before using them
					if (
						defaultStartDate &&
						defaultEndDate &&
						!isNaN(defaultStartDate.getTime()) &&
						!isNaN(defaultEndDate.getTime())
					) {
						// Use the default dates for notification
						currentStart = defaultStartDate;
						currentEnd = defaultEndDate;

						// Update internal state if not controlled (SET DATES FIRST before period type)
						if (!isControlledDates) {
							setInternalStartDate(defaultStartDate);
							setInternalEndDate(defaultEndDate);
							// Now set period type AFTER dates are set (prevents useEffect from firing with null dates)
							setInternalPeriodType(period);
						}
					} else {
						// If conversion failed, fall back to current month's range as a safe default
						const monthRange = periodRanges.month;
						if (monthRange?.startEpoch && monthRange?.endEpoch) {
							const fallbackStart = epochToDate(monthRange.startEpoch);
							const fallbackEnd = epochToDate(monthRange.endEpoch);
							if (fallbackStart && fallbackEnd) {
								currentStart = fallbackStart;
								currentEnd = fallbackEnd;
								if (!isControlledDates) {
									setInternalStartDate(fallbackStart);
									setInternalEndDate(fallbackEnd);
									// Now set period type AFTER dates are set
									setInternalPeriodType(period);
								}
							} else {
								// If even fallback fails, don't proceed
								return;
							}
						} else {
							// No fallback available, don't proceed
							return;
						}
					}
				} else {
					// Dates exist, just update period type and notify
					if (!isControlledPeriod) {
						setInternalPeriodType(period);
					}
					// Save to localStorage
					if (!isControlledPeriod && storeId && typeof window !== "undefined") {
						localStorage.setItem(`rsvp-period-${storeId}`, period);
					}
					// Notify parent with existing dates
					if (
						currentStart &&
						currentEnd &&
						!isNaN(currentStart.getTime()) &&
						!isNaN(currentEnd.getTime())
					) {
						notifyPeriodRangeChange(period, currentStart, currentEnd);
					}
					// Reset flag after a short delay to allow state to settle
					setTimeout(() => {
						isHandlingPeriodChange.current = false;
					}, 0);
					return;
				}

				// Save to localStorage (only reached when dates didn't exist and were set above)
				if (!isControlledPeriod && storeId && typeof window !== "undefined") {
					localStorage.setItem(`rsvp-period-${storeId}`, period);
				}

				// Always notify parent with the dates (either existing or defaults)
				// Ensure dates are valid before notifying
				if (
					currentStart &&
					currentEnd &&
					!isNaN(currentStart.getTime()) &&
					!isNaN(currentEnd.getTime())
				) {
					notifyPeriodRangeChange(period, currentStart, currentEnd);
				}
				// Reset flag after a short delay to allow state to settle
				setTimeout(() => {
					isHandlingPeriodChange.current = false;
				}, 0);
				return;
			}

			// For non-custom periods, update period type first (standard flow)
			// Update controlled or internal state
			if (isControlledPeriod) {
				controlledOnPeriodChange?.(period);
			} else {
				setInternalPeriodType(period);
				// Save to localStorage
				if (storeId && typeof window !== "undefined") {
					localStorage.setItem(`rsvp-period-${storeId}`, period);
					// Clear custom dates if switching to a predefined period (period can't be custom here due to early return above)
					localStorage.removeItem(`rsvp-history-startDate-${storeId}`);
					localStorage.removeItem(`rsvp-history-endDate-${storeId}`);
				}
			}

			// Handle date updates based on period
			if (period === "all") {
				// Update dates directly without triggering handlers (to avoid duplicate notifications)
				if (!isControlledDates) {
					setInternalStartDate(null);
					setInternalEndDate(null);
				} else if (controlledOnStartDateChange && controlledOnEndDateChange) {
					controlledOnStartDateChange(null);
					controlledOnEndDateChange(null);
				}
				// Explicitly notify with the new period type
				notifyPeriodRangeChange(period, null, null);
				// Reset flag after notification
				setTimeout(() => {
					isHandlingPeriodChange.current = false;
				}, 0);
				return;
			}

			// For predefined periods, get range from hook
			const range = periodRanges[period];
			if (range?.startEpoch && range?.endEpoch) {
				const startEpochDate = epochToDate(range.startEpoch);
				const endEpochDate = epochToDate(range.endEpoch);
				if (startEpochDate && endEpochDate) {
					// Update dates directly without triggering handlers (to avoid duplicate notifications)
					if (!isControlledDates) {
						setInternalStartDate(startEpochDate);
						setInternalEndDate(endEpochDate);
						// Clear custom dates from localStorage when switching to predefined period
						if (storeId && typeof window !== "undefined") {
							localStorage.removeItem(`rsvp-history-startDate-${storeId}`);
							localStorage.removeItem(`rsvp-history-endDate-${storeId}`);
						}
					} else if (controlledOnStartDateChange && controlledOnEndDateChange) {
						controlledOnStartDateChange(startEpochDate);
						controlledOnEndDateChange(endEpochDate);
					}
					// Explicitly notify with the new period type to ensure parent gets updated correctly
					// This is the single source of truth for the notification
					notifyPeriodRangeChange(period, startEpochDate, endEpochDate);
				}
			}

			// Reset flag after a short delay to allow state to settle
			setTimeout(() => {
				isHandlingPeriodChange.current = false;
			}, 0);
		},
		[
			isControlledPeriod,
			isControlledDates,
			controlledOnPeriodChange,
			controlledStartDate,
			controlledEndDate,
			internalStartDate,
			internalEndDate,
			storeId,
			periodRanges,
			notifyPeriodRangeChange,
			getNowInStoreTimezone,
			storeTimezone,
			convertToUtc,
		],
	);

	// Internal handlers that update either props or internal state
	const handleStartDateChangeInternal = useCallback(
		(newDate: Date | null) => {
			if (isControlledDates && controlledOnStartDateChange) {
				controlledOnStartDateChange(newDate);
			} else {
				setInternalStartDate(newDate);
				// Save to localStorage
				if (storeId && typeof window !== "undefined") {
					localStorage.setItem(`rsvp-period-${storeId}`, "custom");
					if (newDate) {
						localStorage.setItem(
							`rsvp-history-startDate-${storeId}`,
							newDate.toISOString(),
						);
					}
					const currentEnd = isControlledDates
						? controlledEndDate
						: internalEndDate;
					if (currentEnd) {
						localStorage.setItem(
							`rsvp-history-endDate-${storeId}`,
							currentEnd.toISOString(),
						);
					}
				}
			}

			const currentEnd = isControlledDates
				? (controlledEndDate ?? null)
				: internalEndDate;
			notifyPeriodRangeChange(periodType, newDate, currentEnd);
		},
		[
			isControlledDates,
			controlledOnStartDateChange,
			controlledEndDate,
			internalEndDate,
			storeId,
			periodType,
			notifyPeriodRangeChange,
		],
	);

	const handleEndDateChangeInternal = useCallback(
		(newDate: Date | null) => {
			if (isControlledDates && controlledOnEndDateChange) {
				controlledOnEndDateChange(newDate);
			} else {
				setInternalEndDate(newDate);
				// Save to localStorage
				if (storeId && typeof window !== "undefined") {
					localStorage.setItem(`rsvp-period-${storeId}`, "custom");
					if (newDate) {
						localStorage.setItem(
							`rsvp-history-endDate-${storeId}`,
							newDate.toISOString(),
						);
					}
					const currentStart = isControlledDates
						? (controlledStartDate ?? null)
						: internalStartDate;
					if (currentStart) {
						localStorage.setItem(
							`rsvp-history-startDate-${storeId}`,
							currentStart.toISOString(),
						);
					}
				}
			}

			const currentStart = isControlledDates
				? (controlledStartDate ?? null)
				: internalStartDate;
			notifyPeriodRangeChange(periodType, currentStart, newDate);
		},
		[
			isControlledDates,
			controlledOnEndDateChange,
			controlledStartDate,
			internalStartDate,
			storeId,
			periodType,
			notifyPeriodRangeChange,
		],
	);

	// Apply the temporary dates
	const handleApplyDates = useCallback(() => {
		if (
			tempStartDate &&
			tempEndDate &&
			!isNaN(tempStartDate.getTime()) &&
			!isNaN(tempEndDate.getTime())
		) {
			// Mark that we're handling a period change
			isHandlingPeriodChange.current = true;

			// Update internal state if not controlled
			if (!isControlledPeriod) {
				setInternalPeriodType("custom");
			}
			if (!isControlledDates) {
				setInternalStartDate(tempStartDate);
				setInternalEndDate(tempEndDate);
			}

			// Save to localStorage
			if (!isControlledPeriod && storeId && typeof window !== "undefined") {
				localStorage.setItem(`rsvp-period-${storeId}`, "custom");
			}
			if (!isControlledDates && storeId && typeof window !== "undefined") {
				localStorage.setItem(
					`rsvp-history-startDate-${storeId}`,
					tempStartDate.toISOString(),
				);
				localStorage.setItem(
					`rsvp-history-endDate-${storeId}`,
					tempEndDate.toISOString(),
				);
			}

			// Explicitly notify parent with the new dates
			notifyPeriodRangeChange("custom", tempStartDate, tempEndDate);

			// Reset flag after a short delay
			setTimeout(() => {
				isHandlingPeriodChange.current = false;
			}, 0);

			// Close the popover
			setPopoverOpen(false);
		}
	}, [
		tempStartDate,
		tempEndDate,
		isControlledPeriod,
		isControlledDates,
		storeId,
		notifyPeriodRangeChange,
	]);

	// Sync temp dates with current saved dates when popover opens
	useEffect(() => {
		if (popoverOpen) {
			// Get current saved dates (from controlled props or internal state)
			const currentStart = isControlledDates
				? controlledStartDate
				: internalStartDate;
			const currentEnd = isControlledDates
				? controlledEndDate
				: internalEndDate;

			// If we have saved dates, use them; otherwise use defaults
			if (currentStart && currentEnd) {
				setTempStartDate(currentStart);
				setTempEndDate(currentEnd);
			} else {
				// No saved dates, use defaults (January 1st to December 31st of current year)
				const now = new Date();
				const formatted = formatUtcDateToDateTimeLocal(now, storeTimezone);
				if (formatted) {
					const nowInTz = convertToUtc(formatted, storeTimezone);
					const formatter = new Intl.DateTimeFormat("en-CA", {
						timeZone: storeTimezone,
						year: "numeric",
					});
					const parts = formatter.formatToParts(nowInTz);
					const getValue = (type: string): number =>
						Number(parts.find((p) => p.type === type)?.value || "0");

					const year = getValue("year");

					// Default to January 1st to December 31st of the current year
					const startDateLocal = new Date(year, 0, 1); // January 1st
					const endDateLocal = new Date(year, 11, 31); // December 31st

					const startStr = `${startDateLocal.getFullYear()}-${String(startDateLocal.getMonth() + 1).padStart(2, "0")}-${String(startDateLocal.getDate()).padStart(2, "0")}T00:00`;
					const endStr = `${endDateLocal.getFullYear()}-${String(endDateLocal.getMonth() + 1).padStart(2, "0")}-${String(endDateLocal.getDate()).padStart(2, "0")}T23:59`;

					const defaultStartDate = convertToUtc(startStr, storeTimezone);
					const defaultEndDate = convertToUtc(endStr, storeTimezone);

					if (defaultStartDate && defaultEndDate) {
						setTempStartDate(defaultStartDate);
						setTempEndDate(defaultEndDate);
					}
				}
			}
		}
	}, [
		popoverOpen,
		isControlledDates,
		controlledStartDate,
		controlledEndDate,
		internalStartDate,
		internalEndDate,
		storeTimezone,
	]);

	// Format date for datetime-local input (display in store timezone)
	const formatDateForInput = useCallback(
		(date: Date | null): string => {
			if (!date) return "";
			// date is in UTC, format it to show in store timezone
			return formatUtcDateToDateTimeLocal(date, storeTimezone) || "";
		},
		[storeTimezone],
	);

	// Parse datetime-local input to UTC Date (interpret input as store timezone)
	const parseDateFromInput = useCallback(
		(value: string): Date | null => {
			if (!value) {
				return null;
			}
			try {
				// Interpret the datetime-local string as store timezone and convert to UTC
				const result = convertToUtc(value, storeTimezone);
				return result;
			} catch (error) {
				return null;
			}
		},
		[storeTimezone],
	);

	const isCustom = periodType === "custom";

	return (
		<div className={`flex flex-wrap gap-1.5 sm:gap-2 ${className || ""}`}>
			<Button
				variant={periodType === "week" ? "default" : "outline"}
				size="sm"
				onClick={() => handlePeriodChangeInternal("week")}
				className="h-10 sm:h-9"
			>
				{t("rsvp-period-this-week") || "This Week"}
			</Button>
			<Button
				variant={periodType === "month" ? "default" : "outline"}
				size="sm"
				onClick={() => handlePeriodChangeInternal("month")}
				className="h-10 sm:h-9"
			>
				{t("rsvp-period-this-month") || "This Month"}
			</Button>
			<Button
				variant={periodType === "year" ? "default" : "outline"}
				size="sm"
				onClick={() => handlePeriodChangeInternal("year")}
				className="h-10 sm:h-9"
			>
				{t("rsvp-period-this-year") || "This Year"}
			</Button>
			{/* Custom Period with Popover */}
			{allowCustom && (
				<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
					<PopoverTrigger asChild>
						<Button
							variant={isCustom ? "default" : "outline"}
							size="sm"
							className="h-10 sm:h-9"
							type="button"
							onClick={() => {
								handlePeriodChangeInternal("custom");
							}}
						>
							{t("rsvp-period-custom") || "Custom"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-4" align="start">
						<div className="flex flex-col gap-4">
							<div className="space-y-2">
								<h4 className="font-medium text-sm">
									{t("rsvp-period-custom-date-range") || "Custom Date Range"}
								</h4>
								<p className="text-sm text-muted-foreground">
									{t("rsvp-period-select-start-and-end-dates") ||
										"Select start and end dates for the period"}
								</p>
							</div>
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-2">
									<label
										htmlFor="popover-start-time"
										className="text-sm font-medium"
									>
										{t("rsvp-period-start-time") || "Start Time"}:
									</label>
									<Input
										id="popover-start-time"
										type="datetime-local"
										value={formatDateForInput(tempStartDate || null)}
										onChange={(e) => {
											const newDate = parseDateFromInput(e.target.value);
											if (newDate) {
												setTempStartDate(newDate);
											}
										}}
										className="h-10 text-base sm:text-sm"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<label
										htmlFor="popover-end-time"
										className="text-sm font-medium"
									>
										{t("rsvp-period-end-time") || "End Time"}:
									</label>
									<Input
										id="popover-end-time"
										type="datetime-local"
										value={formatDateForInput(tempEndDate || null)}
										onChange={(e) => {
											const newDate = parseDateFromInput(e.target.value);
											if (newDate) {
												setTempEndDate(newDate);
											}
										}}
										className="h-10 text-base sm:text-sm"
									/>
								</div>
								<div className="flex justify-end gap-2 pt-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPopoverOpen(false)}
										className="h-10 sm:h-9"
									>
										{t("rsvp-period-cancel") || "Cancel"}
									</Button>
									<Button
										variant="default"
										size="sm"
										onClick={handleApplyDates}
										disabled={!tempStartDate || !tempEndDate}
										className="h-10 sm:h-9"
									>
										{t("rsvp-period-apply") || "Apply"}
									</Button>
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			)}
			<Button
				variant={periodType === "all" ? "default" : "outline"}
				size="sm"
				onClick={() => handlePeriodChangeInternal("all")}
				className="h-10 sm:h-9"
			>
				{t("rsvp-period-all") || "All"}
			</Button>
		</div>
	);
}

/**
 * Hook to calculate period ranges in store timezone
 * Returns all period ranges (week, month, year, all) for the current time
 */
/**
 * Get the localized label for a period type
 * @param period - The period type
 * @param t - Translation function from useTranslation hook
 * @returns Localized period label string
 */
export function getPeriodLabel(
	period: PeriodType,
	t: (key: string) => string,
): string {
	switch (period) {
		case "week":
			return t("rsvp-period-this-week") || "This Week";
		case "month":
			return t("rsvp-period-this-month") || "This Month";
		case "year":
			return t("rsvp-period-this-year") || "This Year";
		case "all":
			return t("rsvp-period-all") || "All";
		case "custom":
			return t("rsvp-period-custom") || "Custom";
		default:
			return t("rsvp-period-this-month") || "This Month";
	}
}

export function useRsvpPeriodRanges(storeTimezone: string): PeriodRanges {
	// Helper to get current date/time in store timezone
	const getNowInStoreTimezone = useCallback((): Date => {
		const now = new Date();
		const formatted = formatUtcDateToDateTimeLocal(now, storeTimezone);
		if (!formatted) return now;
		return convertToUtc(formatted, storeTimezone);
	}, [storeTimezone]);

	// Pre-calculate date ranges for all periods
	const allPeriodRanges = useMemo(() => {
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

		// Helper to calculate date range for a period
		const calculateRange = (period: PeriodType): PeriodRange => {
			if (period === "all") {
				return { startEpoch: null, endEpoch: null };
			}

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
				default:
					periodStart = startOfMonth(storeDate);
					periodEnd = endOfMonth(storeDate);
			}

			// Convert period boundaries to UTC (interpret as store timezone)
			const startStr = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-${String(periodStart.getDate()).padStart(2, "0")}T00:00`;
			const endStr = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}-${String(periodEnd.getDate()).padStart(2, "0")}T23:59`;

			const startDate = convertToUtc(startStr, storeTimezone);
			const endDate = convertToUtc(endStr, storeTimezone);

			const startEpoch = dateToEpoch(startDate);
			const endEpoch = dateToEpoch(endDate);

			return { startEpoch, endEpoch };
		};

		return {
			week: calculateRange("week"),
			month: calculateRange("month"),
			year: calculateRange("year"),
			all: calculateRange("all"),
		};
	}, [storeTimezone, getNowInStoreTimezone]);

	return allPeriodRanges;
}
